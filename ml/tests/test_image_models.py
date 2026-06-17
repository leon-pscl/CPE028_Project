"""Architecture and shape tests for the image models.

Currently validates that each model class accepts a standard (1, 3, 224, 224)
input tensor and produces the expected output shape — no trained weights loaded,
no real images needed.

Estimated runtime: <1s.

TODO: Once labeled test images are available in tests/fixtures/, add accuracy
validation tests similar to test_issue_classifier_accuracy.py:
  - Load trained .pth weights
  - Run inference on fixture images
  - Assert predicted class matches label
  - Assert confidence >= threshold (e.g. 0.6)
"""

import pytest
import torch

from predict_unified import ImageClassifier, CrackDetector, CorrosionDetector


BATCH_INPUT = torch.randn(1, 3, 224, 224)


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
