import unittest
from datetime import date
from unittest.mock import Mock, patch
from app import create_app
from app.services.power import fetch_power_daily
from app.services.rotation import recommend_rotations

class RotationTests(unittest.TestCase):
    def test_returns_baseline_and_two_alternatives(self):
        data = recommend_rotations({"current_crop":"potato","priority":"water"})
        self.assertEqual(len(data["recommendations"]), 3)
        self.assertEqual(sum(data["recommendations"][0]["weights"].values()), 1)
        self.assertEqual(sum(r["title"] == "Current crop continued" for r in data["recommendations"]), 1)

    def test_rejects_unknown_crop(self):
        with self.assertRaises(ValueError): recommend_rotations({"current_crop":"mystery"})

    def test_scores_are_not_presented_as_probabilities(self):
        result = recommend_rotations({})
        self.assertTrue(all("probability" in r["caveats"][0] for r in result["recommendations"]))

    def test_soil_values_are_preserved_but_not_scored(self):
        result = recommend_rotations({"soil":{"texture":"Loam","ph":"6.5"}})
        self.assertEqual(result["soil_inputs"], {"texture":"Loam","ph":6.5})
        self.assertIn("not used in scoring", result["data_gaps"][0])

    def test_rejects_out_of_range_ph(self):
        with self.assertRaises(ValueError): recommend_rotations({"soil":{"ph":15}})

class PowerTests(unittest.TestCase):
    @patch("app.services.power.requests.get")
    def test_parses_values_and_missing_sentinel(self, get):
        response = Mock(); response.url = "https://power.larc.nasa.gov/api/test"; response.raise_for_status.return_value = None
        response.json.return_value = {"properties":{"parameter":{"T2M":{"20260101":2.5,"20260102":-999},"PRECTOTCORR":{"20260101":1.2,"20260102":-999}}}}
        get.return_value = response
        result = fetch_power_daily(33.7,75.1,date(2026,1,1),date(2026,1,2))
        self.assertEqual(result["rows"][0]["temperature_c"],2.5)
        self.assertIsNone(result["rows"][1]["temperature_c"])
        self.assertEqual(result["quality"]["missing_days"],1)
        self.assertEqual(result["source"],"NASA POWER")

class ApiTests(unittest.TestCase):
    def setUp(self): self.client = create_app().test_client()
    def test_health(self): self.assertEqual(self.client.get("/health").json["status"],"ok")
    def test_rejects_invalid_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=91&lon=0").status_code,400)
    def test_rejects_nonfinite_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=NaN&lon=0").status_code,400)
    def test_rotation_endpoint(self): self.assertEqual(self.client.post("/api/rotations",json={"current_crop":"rice"}).status_code,200)

if __name__ == "__main__": unittest.main()
