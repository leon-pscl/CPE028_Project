import pytest

try:
    from predict_unified import identify_damaged_components, load_issue_model, load_repairability_model
except ImportError:
    pytest.skip("predict_unified.py not available", allow_module_level=True)


class TestIdentifyDamagedComponents:
    def test_screen_from_crack_text(self):
        result = identify_damaged_components("Screen cracked from drop")
        assert "screen" in result

    def test_battery_from_text(self):
        result = identify_damaged_components("Battery drains very quickly")
        assert "battery" in result

    def test_keyboard_from_text(self):
        result = identify_damaged_components("Keyboard stopped responding")
        assert "keyboard" in result

    def test_charging_port_from_text(self):
        result = identify_damaged_components("USB port not working")
        assert "charging port" in result

    def test_multiple_components(self):
        result = identify_damaged_components("Screen cracked and battery dead")
        assert "screen" in result
        assert "battery" in result

    def test_defaults_to_screen(self):
        result = identify_damaged_components("Something is wrong with my device")
        assert "screen" in result

    def test_with_crack_analysis(self):
        result = identify_damaged_components(
            "Device broken",
            crack_analysis={"classification": "cracked"},
        )
        assert "screen" in result

    def test_with_corrosion_analysis(self):
        result = identify_damaged_components(
            "Device won't turn on",
            corrosion_analysis={"corrosion_level": 7},
        )
        assert "internal components" in result

    def test_with_image_analysis(self):
        result = identify_damaged_components(
            "Device broken",
            image_analysis={"predicted_component": "Battery"},
        )
        assert "battery" in result


class TestModelLoaders:
    def test_load_issue_model_returns_model_or_none(self):
        model = load_issue_model()
        if model is not None:
            assert hasattr(model, "predict")

    def test_load_repairability_model_returns_model_or_none(self):
        model = load_repairability_model()
        if model is not None:
            assert hasattr(model, "predict")
