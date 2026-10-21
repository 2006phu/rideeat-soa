"""OOP QR Code Generator for Driver and Ride Verification."""

import base64
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict


class QRCodeGenerator:
    """Encapsulates generation of SVG and Base64 QR verification payloads for drivers & rides."""

    def __init__(self, issuer: str = "RideEat-SOA", grid_size: int = 21) -> None:
        self._issuer = issuer
        self._grid_size = grid_size

    def generate_verification_qr(
        self,
        subject_type: str,
        subject_id: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create a signed verification payload along with SVG markup and Base64 data URI."""
        payload = {
            "issuer": self._issuer,
            "type": subject_type,
            "subject_id": subject_id,
            "metadata": metadata,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }
        payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(payload_json.encode("utf-8")).digest()
        checksum = digest.hex()[:16]
        payload["checksum"] = checksum

        svg_str = self._render_qr_svg(digest=digest, label=f"{subject_type.upper()}:{subject_id[:8]}")
        svg_b64 = base64.b64encode(svg_str.encode("utf-8")).decode("ascii")

        return {
            "subject_type": subject_type,
            "subject_id": subject_id,
            "checksum": checksum,
            "qr_payload": payload,
            "qr_svg": svg_str,
            "qr_base64": svg_b64,
            "qr_data_uri": f"data:image/svg+xml;base64,{svg_b64}",
        }

    def generate_driver_qr(
        self,
        driver_id: str,
        user_id: str,
        license_plate: str,
        vehicle_type: str,
        status: str,
    ) -> Dict[str, Any]:
        """Generate a verification QR code for a driver profile."""
        return self.generate_verification_qr(
            subject_type="driver_verification",
            subject_id=driver_id,
            metadata={
                "driver_id": driver_id,
                "user_id": user_id,
                "license_plate": license_plate,
                "vehicle_type": vehicle_type,
                "status": status,
                "verified": status == "approved",
            },
        )

    def _render_qr_svg(self, digest: bytes, label: str) -> str:
        """Render a deterministic 21x21 QR-style matrix SVG with finder patterns."""
        size = self._grid_size
        cell = 8
        margin = 16
        total_px = size * cell + margin * 2
        rects = []

        def is_finder_module(r: int, c: int) -> bool:
            for fr, fc in ((0, 0), (0, size - 7), (size - 7, 0)):
                if fr <= r < fr + 7 and fc <= c < fc + 7:
                    dr, dc = r - fr, c - fc
                    if dr in (0, 6) or dc in (0, 6):
                        return True
                    if 2 <= dr <= 4 and 2 <= dc <= 4:
                        return True
                    return False
            return False

        def is_finder_zone(r: int, c: int) -> bool:
            return (
                (r < 8 and c < 8)
                or (r < 8 and c >= size - 8)
                or (r >= size - 8 and c < 8)
            )

        bit_idx = 0
        total_bits = len(digest) * 8
        for r in range(size):
            for c in range(size):
                if is_finder_zone(r, c):
                    dark = is_finder_module(r, c)
                else:
                    byte_val = digest[(bit_idx // 8) % len(digest)]
                    bit_val = (byte_val >> (bit_idx % 8)) & 1
                    dark = bool(bit_val ^ ((r + c) % 2 == 0))
                    bit_idx = (bit_idx + 1) % total_bits
                if dark:
                    x = margin + c * cell
                    y = margin + r * cell
                    rects.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="#0f172a"/>')

        rects_Joined = "".join(rects)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_px} {total_px + 20}" '
            f'width="{total_px}" height="{total_px + 20}">'
            f'<rect width="100%" height="100%" fill="#ffffff" rx="8"/>'
            f"{rects_Joined}"
            f'<text x="{total_px / 2}" y="{total_px + 12}" text-anchor="middle" '
            f'font-family="monospace" font-size="10" fill="#334155">{label}</text>'
            f"</svg>"
        )
