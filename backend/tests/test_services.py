import unittest
from datetime import date
from unittest.mock import Mock, patch
from app import create_app
from app.services.power import fetch_power_daily, fetch_power_projection, fetch_power_water, fetch_power_monthly_profile
from app.services.gibs import fetch_gibs_image, fetch_gibs_legend
from app.services.rotation import recommend_rotations, CROPS
from app.services.intelligence import vegetation, bare_windows, water_budget, climate_analogs, spatial_zones, bayesian_feedback, rotation_risk
from app.services.cache import ttl_cache

class CacheTests(unittest.TestCase):
    def test_ttl_cache_reuses_success_and_does_not_cache_failures(self):
        calls=[]
        @ttl_cache(seconds=60,max_entries=2)
        def lookup(key):
            calls.append(key)
            if key=="bad": raise RuntimeError("upstream error")
            return {"key":key}
        self.assertEqual(lookup("a"),lookup("a"))
        self.assertEqual(calls,["a"])
        for _ in range(2):
            with self.assertRaises(RuntimeError): lookup("bad")
        self.assertEqual(calls,["a","bad","bad"])

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

    def test_custom_weights_are_normalized(self):
        result=recommend_rotations({"weights":{"water":2,"diversity":1,"soil":1,"preference":0}})
        self.assertAlmostEqual(sum(result["recommendations"][0]["weights"].values()),1)

    def test_alternatives_respect_adjacent_family_constraint(self):
        result=recommend_rotations({"current_crop":"rice"})
        for row in result["recommendations"]:
            if row["title"]!="Current crop continued":
                self.assertTrue(all(CROPS[row["sequence"][i]]["family"]!=CROPS[row["sequence"][i+1]]["family"] for i in range(2)))

class PowerTests(unittest.TestCase):
    @patch("app.services.power.requests.get")
    def test_parses_values_and_missing_sentinel(self, get):
        response = Mock(); response.url = "https://power.larc.nasa.gov/api/test"; response.raise_for_status.return_value = None
        response.json.return_value = {"properties":{"parameter":{"T2M":{"20260101":2.5,"20260102":-999},"PRECTOTCORR":{"20260101":1.2,"20260102":-999}}}}
        get.return_value = response
        result = fetch_power_daily(33.7,75.1,date(2026,1,1),date(2026,1,2))
        self.assertEqual(result["rows"][0]["temperature_c"],2.5)
        self.assertIsNone(result["rows"][1]["temperature_c"])
        self.assertEqual(result["rows"][0]["provenance"][0]["provider"],"NASA")
        self.assertEqual(result["rows"][0]["provenance"][0]["unit"],"°C")
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
        self.assertEqual(result["quality"]["values_available"],6)

    @patch("app.services.power.requests.get")
    def test_projection_retains_missing_values_as_null(self,get):
        response=Mock();response.url="https://power.larc.nasa.gov/api/projection/monthly/point";response.raise_for_status.return_value=None
        response.json.return_value={"properties":{"parameter":{"T2M":{"ssp126":{"204001":-999},"ssp245":{"204001":-999},"ssp370":{"204001":-999}},"PRECTOTCORR":{"ssp126":{"204001":-999},"ssp245":{"204001":-999},"ssp370":{"204001":-999}}}}}
        get.return_value=response
        result=fetch_power_projection(33.123,75.234,2040,2040)
        self.assertEqual(result["quality"],{"expected_values":6,"values_available":0,"missing_values":6})
        self.assertTrue(all(row["value"] is None for row in result["rows"]))
        self.assertTrue(result["data_gaps"])

    @patch("app.services.power.requests.get")
    def test_parses_hydrology_values_and_uses_ag_api_community(self,get):
        response=Mock();response.url="https://power.larc.nasa.gov/api/test";response.raise_for_status.return_value=None
        response.json.return_value={"properties":{"parameter":{"PRECTOTCORR":{"20260101":2.0},"SFMC":{"20260101":0.2},"RZMC":{"20260101":-999},"EVPTRNS":{"20260101":3.0}}}}
        get.return_value=response
        result=fetch_power_water(33,75,date(2026,1,1),date(2026,1,1))
        self.assertEqual(result["rows"][0]["prectotcorr"],2)
        self.assertIsNone(result["rows"][0]["rzmc"])
        self.assertEqual(get.call_args.kwargs["params"]["community"],"AG")

    @patch("app.services.power.requests.get")
    def test_parses_monthly_climate_profile_and_drops_annual_aggregate(self,get):
        response=Mock();response.url="https://power.larc.nasa.gov/api/test";response.raise_for_status.return_value=None
        response.json.return_value={"properties":{"parameter":{"T2M":{"202001":2,"202013":4},"PRECTOTCORR":{"202001":3,"202013":5}}}}
        get.return_value=response
        result=fetch_power_monthly_profile(33,75,2020,2020)
        self.assertEqual(len(result["rows"]),1)
        self.assertEqual(result["rows"][0]["month"],"202001")
        self.assertEqual(get.call_args.kwargs["params"]["start"],"2020")

class IntelligenceTests(unittest.TestCase):
    def test_vegetation_reports_missing_dates_without_diagnosis(self):
        data=vegetation({"source":"NASA MODIS MOD13Q1 v061","resolution":"250m product grid","index":"NDVI","observations":[{"date":"2026-01-01","value":0.3},{"date":"2026-03-01","value":0.1}]})
        self.assertEqual(data["observation_count"],2)
        self.assertIn("not a diagnosis",data["interpretation"])
        self.assertEqual(data["possible_low_vegetation_dates"],["2026-03-01"])

    def test_vegetation_restricts_sources_to_challenge_allowlist(self):
        with self.assertRaises(ValueError): vegetation({"source":"Unlisted commercial satellite v2","resolution":"10m","observations":[{"date":"2026-01-01","value":-0.1}]})
        result=vegetation({"source":"NASA MODIS MOD13Q1 v061","resolution":"250m","observations":[{"date":"2026-01-01","value":-0.1}]})
        self.assertEqual(result["observations"][0]["value"],-0.1)

    def test_bare_windows_never_call_fallow_verified(self):
        data=bare_windows({"source":"NASA MODIS MOD13Q1 v061","resolution":"250m","observations":[{"date":"2026-01-01","value":0.1}]})
        self.assertIn("not verified fallow",data["windows"][0]["label"])

    def test_bare_windows_rejects_invalid_threshold(self):
        body={"source":"NASA MODIS MOD13Q1 v061","resolution":"250m","observations":[{"date":"2026-01-01","value":.3}],"low_threshold":None}
        with self.assertRaises(ValueError): bare_windows(body)

    def test_water_budget_uses_manual_scenarios_and_area_conversion(self):
        data=water_budget({"area_hectares":2,"crop_demand_mm":100,"irrigation_mm":20,"expected_rainfall_mm":{"dry":30,"normal":80,"wet":120}})
        self.assertEqual(data["scenarios"]["dry"]["deficit_volume_m3"],1000)

    def test_climate_analogues_rank_by_distance_without_prediction_language(self):
        data=climate_analogs({"field_profile":{"temperature_c":10,"precipitation_mm_day":1},"candidates":[{"name":"far","temperature_c":20,"precipitation_mm_day":5},{"name":"near","temperature_c":11,"precipitation_mm_day":1}]})
        self.assertEqual(data["analogs"][0]["name"],"near")
        self.assertIn("not a future-climate prediction",data["interpretation"].lower())

    def test_zones_cluster_supplied_samples(self):
        points=[{"latitude":33,"longitude":75,"v":0},{"latitude":33.1,"longitude":75.1,"v":0.1},{"latitude":34,"longitude":76,"v":1},{"latitude":34.1,"longitude":76.1,"v":0.9}]
        data=spatial_zones({"points":points,"features":["v"],"zone_count":2})
        self.assertEqual(sum(z["sample_count"] for z in data["zones"]),4)

    def test_bayesian_feedback_keeps_subjective_signal_explicit(self):
        data=bayesian_feedback({"helpful":True,"previous_feedback":{"helpful":1,"not_helpful":0}})
        self.assertEqual(data["posterior"]["alpha"],4)
        self.assertIn("Subjective",data["observation"])

    def test_bayesian_feedback_rejects_nonfinite_prior(self):
        with self.assertRaises(ValueError): bayesian_feedback({"helpful":True,"prior_alpha":float("nan")})

class GIBSTests(unittest.TestCase):
    @patch("app.services.gibs.requests.get")
    def test_fetches_modis_visualization_with_source_metadata(self,get):
        response=Mock(); response.url="https://gibs.earthdata.nasa.gov/wms/example"; response.raise_for_status.return_value=None
        response.headers={"Content-Type":"image/jpeg"}; response.content=b"jpeg-data"; get.return_value=response
        image,metadata=fetch_gibs_image(33.7,75.1,date(2026,1,1),"modis_terra")
        self.assertEqual(image,b"jpeg-data")
        self.assertEqual(metadata["provider"],"NASA Global Imagery Browse Services (GIBS)")
        self.assertEqual(metadata["date"],"2026-01-01")
    @patch("app.services.gibs.requests.get")
    def test_fetches_viirs_ndvi_browse_layer(self,get):
        response=Mock();response.url="https://gibs.earthdata.nasa.gov/wms/example";response.raise_for_status.return_value=None
        response.headers={"Content-Type":"image/png"};response.content=b"ndvi-map";get.return_value=response
        image,metadata=fetch_gibs_image(33.7,75.1,date(2026,11,1),"viirs_ndvi")
        self.assertEqual(image,b"ndvi-map")
        self.assertEqual(metadata["layer"]["id"],"VIIRS_SNPP_NDVI_8Day")
        self.assertIn("browse visualization",metadata["note"])
    @patch("app.services.gibs.requests.get")
    def test_gibs_zoom_updates_view_bounds(self,get):
        response=Mock();response.url="https://gibs.earthdata.nasa.gov/wms/example";response.raise_for_status.return_value=None
        response.headers={"Content-Type":"image/png"};response.content=b"png";get.return_value=response
        _,metadata=fetch_gibs_image(33.7,75.1,date(2026,1,2),"modis_ndvi",2)
        self.assertAlmostEqual(metadata["bounds"]["west"],74.875)
        self.assertAlmostEqual(metadata["bounds"]["east"],75.325)
        bbox=[float(value) for value in get.call_args.kwargs["params"]["BBOX"].split(",")]
        self.assertAlmostEqual(bbox[2]-bbox[0],.45)
        self.assertAlmostEqual(bbox[3]-bbox[1],.3)
    @patch("app.services.gibs._fetch_legend_capabilities",return_value={"MODIS_Terra_NDVI_8Day":"https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.png"})
    @patch("app.services.gibs.requests.get")
    def test_fetches_advertised_nasa_legend(self,get,_caps):
        response=Mock();response.raise_for_status.return_value=None;response.headers={"Content-Type":"image/png"};response.content=b"legend";get.return_value=response
        image,metadata=fetch_gibs_legend("modis_ndvi")
        self.assertEqual(image,b"legend")
        self.assertEqual(metadata["request_url"],"https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.png")

class ApiTests(unittest.TestCase):
    def setUp(self): self.client = create_app().test_client()
    def test_health(self): self.assertEqual(self.client.get("/health").json["status"],"ok")
    def test_vercel_origin_is_allowed_for_browser_api_calls(self):
        origin="https://terra-rotate-ai.vercel.app"
        preflight=self.client.options("/api/rotations",headers={"Origin":origin,"Access-Control-Request-Method":"POST"})
        self.assertEqual(preflight.headers.get("Access-Control-Allow-Origin"),origin)
        climate_payload={"source":"NASA POWER","rows":[]}
        with patch("app.routes.fetch_power_daily",return_value=climate_payload):
            climate=self.client.get("/api/climate?lat=33.7&lon=75.1",headers={"Origin":origin})
        rotation=self.client.post("/api/rotations",json={"current_crop":"potato"},headers={"Origin":origin})
        self.assertEqual(climate.status_code,200)
        self.assertEqual(climate.headers.get("Access-Control-Allow-Origin"),origin)
        self.assertEqual(rotation.status_code,200)
        self.assertEqual(rotation.headers.get("Access-Control-Allow-Origin"),origin)
    def test_rejects_invalid_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=91&lon=0").status_code,400)
    def test_rejects_nonfinite_coordinates(self): self.assertEqual(self.client.get("/api/climate?lat=NaN&lon=0").status_code,400)
    def test_rejects_unknown_imagery_layer(self): self.assertEqual(self.client.get("/api/imagery?lat=33&lon=75&layer=other").status_code,400)
    def test_rejects_out_of_range_imagery_zoom(self): self.assertEqual(self.client.get("/api/imagery?lat=33&lon=75&zoom=5").status_code,400)
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
    def test_legend_proxy_returns_source_headers(self):
        metadata={"provider":"NASA GIBS","layer":{"id":"MODIS_Terra_NDVI_8Day"},"note":"official legend"}
        with patch("app.routes.fetch_gibs_legend",return_value=(b"legend",metadata)):
            response=self.client.get("/api/imagery/legend?layer=modis_ndvi")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.headers["X-Data-Layer"],"MODIS_Terra_NDVI_8Day")
    def test_rotation_endpoint(self): self.assertEqual(self.client.post("/api/rotations",json={"current_crop":"rice"}).status_code,200)
    def test_analysis_routes_require_valid_inputs(self):
        self.assertEqual(self.client.post("/api/intelligence/vegetation",json={}).status_code,400)
        self.assertEqual(self.client.post("/api/intelligence/climate-analogs",json={}).status_code,400)
        bad={"field":{"latitude":33,"longitude":75},"candidates":[None]}
        self.assertEqual(self.client.post("/api/intelligence/climate-analogs",json=bad).status_code,400)
    def test_rotation_risk_endpoint_does_not_invent_confidence(self):
        data=self.client.post("/api/intelligence/rotation-risk",json={}).json
        self.assertIn("Insufficient evidence",data["confidence"])
    def test_climate_analogs_uses_nasa_profiles_at_user_coordinates(self):
        months=[f"2020{i:02}" for i in range(1,13)]
        def profile(lat,lon,start,end):
            return {"source":"NASA POWER Monthly Point API","coordinates":{"latitude":lat,"longitude":lon},"period":{"start_year":start,"end_year":end},"rows":[{"month":m,"temperature_c":float(int(m[-2:])),"precipitation_mm_day":1.} for m in months]}
        with patch("app.routes.fetch_power_monthly_profile",side_effect=profile) as fetch:
            response=self.client.post("/api/intelligence/climate-analogs",json={"field":{"latitude":33,"longitude":75},"candidates":[{"name":"Nearby","latitude":34,"longitude":76}],"start_year":2020,"end_year":2020})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json["source"],"NASA POWER Monthly Point API")
        self.assertEqual(response.json["analogs"][0]["name"],"Nearby")
        self.assertEqual(fetch.call_count,2)

if __name__ == "__main__": unittest.main()
