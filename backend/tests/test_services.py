import unittest
from datetime import date
from unittest.mock import Mock, patch
from app import create_app
from app.services.power import fetch_power_daily, fetch_power_projection
from app.services.gibs import fetch_gibs_image
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
        self.assertEqual(get.call_args.kwargs["params"]["time-standard"],"UTC")

    @patch("app.services.power.requests.get")
    def test_parses_future_projection_scenarios(self, get):
        response=Mock(); response.url="https://power.larc.nasa.gov/api/projection/monthly/point"; response.raise_for_status.return_value=None
        response.json.return_value={"properties":{"parameter":{"T2M":{"ssp126":{"204101":10.0},"ssp245":{"204101":11.0},"ssp370":{"204101":12.0}},"PRECTOTCORR":{"ssp126":{"204101":1.0},"ssp245":{"204101":1.1},"ssp370":{"204101":1.2}}}}}
        get.return_value=response
        result=fetch_power_projection(33.7,75.1,2041,2060)
        self.assertEqual(result["scenarios"],["ssp126","ssp245","ssp370"])
        self.assertEqual(len(result["rows"]),6)

class GIBSTests(unittest.TestCase):
    @patch("app.services.gibs.requests.get")
    def test_fetches_modis_visualization_with_source_metadata(self,get):
        response=Mock(); response.url="https://gibs.earthdata.nasa.gov/wms/example"; response.raise_for_status.return_value=None
        response.headers={"Content-Type":"image/jpeg"}; response.content=b"jpeg-data"; get.return_value=response
        image,metadata=fetch_gibs_image(33.7,75.1,date(2026,1,1),"modis_terra")
        self.assertEqual(image,b"jpeg-data")
        self.assertEqual(metadata["provider"],"NASA Global Imagery Browse Services (GIBS)")
        self.assertEqual(metadata["date"],"2026-01-01")

class ApiTests(unittest.TestCase):
    def setUp(self): self.client = create_app().test_client()
    def test_health(self): self.assertEqual(self.client.get("/health").json["status"],"ok")
    def test_rejects_invalid_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=91&lon=0").status_code,400)
    def test_rejects_nonfinite_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=NaN&lon=0").status_code,400)
    def test_rejects_unknown_imagery_layer(self): self.assertEqual(self.client.get("/api/imagery?lat=33&lon=75&layer=other").status_code,400)
    def test_rejects_future_imagery_date(self):
        self.assertEqual(self.client.get("/api/imagery?lat=33&lon=75&date=2999-01-01").status_code,400)
    def test_rejects_invalid_projection_period(self): self.assertEqual(self.client.get("/api/climate/projection?lat=33&lon=75&start_year=2100&end_year=2040").status_code,400)
    def test_rejects_power_projection_latitude_outside_coverage(self): self.assertEqual(self.client.get("/api/climate/projection?lat=90&lon=75&start_year=2041&end_year=2060").status_code,400)
    def test_projection_endpoint_calls_nasa_projection_service(self):
        payload={"source":"NASA POWER Projection API","scenarios":["ssp126","ssp245","ssp370"],"rows":[]}
        with patch("app.routes.fetch_power_projection",return_value=payload) as fetch:
            response=self.client.get("/api/climate/projection?lat=33&lon=75&start_year=2041&end_year=2060")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json["source"],"NASA POWER Projection API")
        fetch.assert_called_once_with(33.0,75.0,2041,2060)

    def test_imagery_proxy_returns_source_headers(self):
        metadata={"provider":"NASA GIBS","date":"2026-01-01","layer":{"id":"MODIS_Terra_CorrectedReflectance_TrueColor"},"note":"visualization only"}
        with patch("app.routes.fetch_gibs_image",return_value=(b"image",metadata)):
            response=self.client.get("/api/imagery?lat=33&lon=75&date=2026-01-01")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.mimetype,"image/jpeg")
        self.assertEqual(response.headers["X-Data-Source"],"NASA GIBS")
    def test_rotation_endpoint(self): self.assertEqual(self.client.post("/api/rotations",json={"current_crop":"rice"}).status_code,200)

if __name__ == "__main__": unittest.main()
