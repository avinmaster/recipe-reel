"""Best-effort hardware introspection for the 'Use of AMD Platforms' transparency panel."""
from __future__ import annotations

from functools import lru_cache


@lru_cache
def gpu_info() -> dict[str, str | None]:
    """Return {device, gpu_name, rocm_version}. Never raises; safe without torch."""
    info: dict[str, str | None] = {"device": "cpu", "gpu_name": None, "rocm_version": None}
    try:
        import torch  # noqa: PLC0415

        if torch.cuda.is_available():
            info["device"] = "cuda"
            info["gpu_name"] = torch.cuda.get_device_name(0)
            # On ROCm builds, torch.version.hip is set (CUDA masquerade).
            info["rocm_version"] = getattr(torch.version, "hip", None)
    except Exception:  # noqa: BLE001
        pass
    return info


def is_amd_gpu() -> bool:
    info = gpu_info()
    name = (info.get("gpu_name") or "").lower()
    return bool(info.get("rocm_version")) or "instinct" in name or "amd" in name or "radeon" in name
