"""OOP AI Culinary Recommender powered by Google Gemini API with Smart Domain Fallback."""

import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)


class FoodAIRecommender:
    """Encapsulates AI dish & restaurant recommendations based on mood, weather, and budget."""

    def __init__(self, gemini_api_key: Optional[str] = None) -> None:
        self._api_key = gemini_api_key

    async def recommend(
        self,
        mood: str,
        weather: str = "sunny",
        budget_vnd: float = 100000.0,
        catalog_dishes: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate personalized culinary recommendations from available restaurant menus."""
        dishes = catalog_dishes or []
        affordable = [d for d in dishes if float(d.get("price", 0)) <= budget_vnd]
        candidates = affordable if affordable else dishes

        selected = self._select_smart_matches(mood=mood, weather=weather, candidates=candidates)

        if self._api_key:
            ai_reason = await self._call_gemini(mood, weather, budget_vnd, selected)
            if ai_reason:
                return {
                    "provider": "google-gemini",
                    "mood": mood,
                    "weather": weather,
                    "budget_vnd": budget_vnd,
                    "recommendation_summary": ai_reason,
                    "recommended_dishes": selected,
                }

        fallback_reason = self._build_fallback_summary(mood, weather, budget_vnd, selected)
        return {
            "provider": "rideeat-culinary-expert-fallback",
            "mood": mood,
            "weather": weather,
            "budget_vnd": budget_vnd,
            "recommendation_summary": fallback_reason,
            "recommended_dishes": selected,
        }

    @staticmethod
    def _select_smart_matches(
        mood: str,
        weather: str,
        candidates: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not candidates:
            return []
        combined = f"{mood} {weather}".lower()
        scored: List[ tuple[int, Dict[str, Any]] ] = []
        for dish in candidates:
            score = 1
            text = f"{dish.get('name', '')} {dish.get('description', '')} {dish.get('category', '')}".lower()
            if any(k in combined for k in ("rain", "cold", "mưa", "lạnh", "warm", "sad", "tired")):
                if any(w in text for w in ("phở", "bún", "soup", "nóng", "bò", "huế")):
                    score += 5
            if any(k in combined for k in ("hot", "sunny", "nắng", "nóng", "fresh", "energetic", "work")):
                if any(w in text for w in ("trà", "cà phê", "coffee", "tea", "gỏi", "cơm", "bánh mì")):
                    score += 5
            if any(k in combined for k in ("hungry", "đói", "lunch", "trưa", "dinner", "tối")):
                if any(w in text for w in ("cơm tấm", "sườn", "phở", "đặc biệt")):
                    score += 4
            scored.append((score, dish))

        scored.sort(key=lambda pair: (-pair[0], float(pair[1].get("price", 0))))
        return [item for _, item in scored[:4]]

    async def _call_gemini(
        self,
        mood: str,
        weather: str,
        budget_vnd: float,
        selected_dishes: List[Dict[str, Any]],
    ) -> Optional[str]:
        dish_names = ", ".join(
            f"{d.get('name')} ({d.get('price', 0):,.0f} VND - {d.get('restaurant_name', '')})"
            for d in selected_dishes
        )
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={self._api_key}"
        )
        prompt = (
            "You are RideEat Culinary AI Recommender. "
            f"Customer mood='{mood}', weather='{weather}', budget={budget_vnd:,.0f} VND. "
            f"Top matching dishes in our Vietnamese catalog: {dish_names}. "
            "Write a warm, appetizing 2-sentence recommendation explaining why these dishes fit their mood and weather."
        )
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return str(parts[0]["text"]).strip()
        except Exception as exc:
            logger.warning(f"Gemini API call failed in FoodAIRecommender, using fallback: {exc}")
        return None

    @staticmethod
    def _build_fallback_summary(
        mood: str,
        weather: str,
        budget_vnd: float,
        selected_dishes: List[Dict[str, Any]],
    ) -> str:
        if not selected_dishes:
            return f"Với ngân sách {budget_vnd:,.0f} VND, hãy thử các món truyền thống Việt Nam tươi ngon trên RideEat!"
        top_names = ", ".join(f"{d.get('name')} ({d.get('price', 0):,.0f}đ)" for d in selected_dishes[:3])
        return (
            f"Dựa trên tâm trạng '{mood}', thời tiết '{weather}' và ngân sách {budget_vnd:,.0f} VND, "
            f"RideEat AI gợi ý cho bạn: {top_names}. Đặt ngay để thưởng thức nóng hổi!"
        )
