"""OOP AI Ride Assistant powered by Google Gemini API with Smart Rule-Based Fallback."""

import logging
from typing import Any, Dict, Optional
import httpx

from app.pricing_strategy import RidePricingFactory

logger = logging.getLogger(__name__)


class RideAIAssistant:
    """Encapsulates generative AI customer support and intelligent ride fare advisory."""

    def __init__(self, gemini_api_key: Optional[str] = None) -> None:
        self._api_key = gemini_api_key

    async def answer_support_query(
        self,
        question: str,
        distance_km: Optional[float] = None,
        duration_minutes: Optional[float] = None,
        surge_multiplier: float = 1.0,
    ) -> Dict[str, Any]:
        """Answer customer ride/fare questions using Gemini 1.5 Flash or domain rule engine fallback."""
        dist = distance_km if distance_km is not None and distance_km > 0 else 5.0
        dur = duration_minutes if duration_minutes is not None and duration_minutes > 0 else 15.0

        fares = {
            vtype: RidePricingFactory.create_strategy(vtype, surge_multiplier).calculate_fare(dist, dur)
            for vtype in ("motorbike", "car_4", "car_7")
        }

        if self._api_key:
            ai_reply = await self._call_gemini(question, dist, dur, surge_multiplier, fares)
            if ai_reply:
                return {
                    "provider": "google-gemini",
                    "question": question,
                    "answer": ai_reply,
                    "estimated_fares_vnd": fares,
                    "distance_km": dist,
                    "duration_minutes": dur,
                    "surge_multiplier": surge_multiplier,
                }

        fallback_reply = self._build_rule_based_response(question, dist, dur, surge_multiplier, fares)
        return {
            "provider": "rideeat-domain-expert-fallback",
            "question": question,
            "answer": fallback_reply,
            "estimated_fares_vnd": fares,
            "distance_km": dist,
            "duration_minutes": dur,
            "surge_multiplier": surge_multiplier,
        }

    async def _call_gemini(
        self,
        question: str,
        distance_km: float,
        duration_minutes: float,
        surge_multiplier: float,
        fares: Dict[str, float],
    ) -> Optional[str]:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={self._api_key}"
        )
        prompt = (
            "You are RideEat AI Assistant, a helpful Vietnamese/English ride-hailing support agent. "
            f"Context: distance={distance_km:.1f}km, duration={duration_minutes:.0f}min, surge={surge_multiplier}x. "
            f"Estimated fares: Motorbike={fares['motorbike']:,.0f} VND, Car 4-seat={fares['car_4']:,.0f} VND, "
            f"Car 7-seat={fares['car_7']:,.0f} VND. "
            f"Customer question: {question}. Provide a concise, friendly, accurate response."
        )
        body = {"contents": [{"parts": [{"text": prompt}]}]}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return str(parts[0]["text"]).strip()
        except Exception as exc:
            logger.warning(f"Gemini API call failed in RideAIAssistant, using smart fallback: {exc}")
        return None

    @staticmethod
    def _build_rule_based_response(
        question: str,
        distance_km: float,
        duration_minutes: float,
        surge_multiplier: float,
        fares: Dict[str, float],
    ) -> str:
        q_lower = (question or "").lower()
        if any(k in q_lower for k in ("otp", "qr", "start", "mã", "bắt đầu")):
            return (
                "Để đảm bảo an toàn, mỗi chuyến xe RideEat đều có mã OTP 4 chữ số và mã chia sẻ hành trình. "
                "Bạn chỉ cần đọc mã OTP cho tài xế khi lên xe để tài xế bắt đầu chuyến đi."
            )
        if any(k in q_lower for k in ("cancel", "hủy", "huỷ")):
            return (
                "Bạn có thể hủy chuyến miễn phí khi chuyến xe đang ở trạng thái 'searching' hoặc 'accepted' "
                "trước khi tài xế bắt đầu hành trình ('in_progress')."
            )
        if any(k in q_lower for k in ("rain", "mưa", "group", "nhóm", "family", "gia đình", "7")):
            return (
                f"Với nhóm đông người hoặc trời mưa (hệ số {surge_multiplier}x), RideEat gợi ý Ô tô 7 chỗ "
                f"({fares['car_7']:,.0f} VND) hoặc Ô tô 4 chỗ ({fares['car_4']:,.0f} VND) cho quãng đường {distance_km:.1f} km."
            )
        return (
            f"Dự kiến cước phí cho quãng đường {distance_km:.1f} km (~{duration_minutes:.0f} phút, hệ số {surge_multiplier}x): "
            f"Xe máy: {fares['motorbike']:,.0f} VND | Ô tô 4 chỗ: {fares['car_4']:,.0f} VND | "
            f"Ô tô 7 chỗ: {fares['car_7']:,.0f} VND. Áp mã khuyến mãi khi đặt để được giảm thêm!"
        )
