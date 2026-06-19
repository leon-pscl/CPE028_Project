"""Architecture and inference tests for the image models.

Shape tests validate standard (1, 3, 224, 224) input/output — no weights needed.
Inference tests load trained .pth weights and run on real fixture images.
"""

import pytest
import torch
from pathlib import Path

from predict_unified import ImageClassifier, CrackDetector, CorrosionDetector

FIXTURES = Path(__file__).resolve().parent / "fixtures"
BATCH_INPUT = torch.randn(1, 3, 224, 224)


# --- Shape tests (no weights, no fixtures) ---


def test_image_classifier_output_shape():
    model = ImageClassifier(num_classes=10)
    model.eval()
    with torch.no_grad():
        output = model(BATCH_INPUT)
    assert output.shape == (1, 10), f"Expected (1, 10), got {output.shape}"


def test_crack_detector_output_shape():
    model = CrackDetector(num_classes=2)
    model.eval()
    with torch.no_grad():
        output = model(BATCH_INPUT)
    assert output.shape == (1, 2), f"Expected (1, 2), got {output.shape}"


def test_corrosion_detector_output_shape():
    model = CorrosionDetector(num_classes=5)
    model.eval()
    with torch.no_grad():
        output = model(BATCH_INPUT)
    assert output.shape == (1, 5), f"Expected (1, 5), got {output.shape}"


def test_models_produce_logits():
    """Verify raw logits are returned (not NaN or Inf)."""
    for ModelClass, num_classes in [
        (ImageClassifier, 10),
        (CrackDetector, 2),
        (CorrosionDetector, 5),
    ]:
        model = ModelClass(num_classes=num_classes)
        model.eval()
        with torch.no_grad():
            output = model(BATCH_INPUT)
        assert not torch.isnan(output).any(), f"{ModelClass.__name__} produced NaN"
        assert not torch.isinf(output).any(), f"{ModelClass.__name__} produced Inf"


# --- Inference tests (trained weights + fixture images) ---


def _predict(model, image_path, image_transform):
    from PIL import Image
    img = Image.open(image_path).convert("RGB")
    tensor = image_transform(img).unsqueeze(0)
    with torch.no_grad():
        output = model(tensor)
    return output.argmax(dim=1).item()


def test_crack_inference(crack_model, image_transform):
    """Crack detector must classify cracked and not_cracked images.

    ImageFolder sorts alphabetically → 0=cracked, 1=not_cracked.
    """
    cracked_img = FIXTURES / "crack" / "cracked" / "Cracked_iPhone.jpg"
    not_cracked_img = FIXTURES / "crack" / "not_cracked" / "1644876223_Recensione-Samsung-Galaxy-S21-FE-Samsung-SM-G990E-Pickr.jpg"

    if not cracked_img.exists() or not not_cracked_img.exists():
        pytest.skip("fixture images missing")

    # ponytail: ImageFolder sorts folder names alphabetically → 0=cracked, 1=not_cracked
    pred = _predict(crack_model, cracked_img, image_transform)
    assert pred == 0, f"Expected cracked (0), got {pred}"

    pred = _predict(crack_model, not_cracked_img, image_transform)
    assert pred == 1, f"Expected not_cracked (1), got {pred}"


def test_corrosion_inference(corrosion_model, image_transform):
    """Corrosion detector runs on each level — allow ±1 off-by-one (ordinal data)."""
    for level in [5, 6, 7, 8, 9]:
        img_dir = FIXTURES / "corrosion" / str(level)
        imgs = list(img_dir.glob("*.jpg"))
        if not imgs:
            pytest.skip(f"no fixture images for corrosion level {level}")
        pred = _predict(corrosion_model, imgs[0], image_transform)
        expected = level - 5
        assert abs(pred - expected) <= 1, f"Level {level}: expected ~{expected}, got {pred}"


def test_component_inference(component_model, image_transform):
    """Component classifier produces a valid class index for fixture images."""
    for name in ["battery", "keyboard", "ram"]:
        img_dir = FIXTURES / "components" / name
        imgs = list(img_dir.glob("*.jpg"))
        if not imgs:
            pytest.skip(f"no fixture images for {name}")
        pred = _predict(component_model, imgs[0], image_transform)
        assert 0 <= pred <= 9, f"{name}: invalid class index {pred}"
