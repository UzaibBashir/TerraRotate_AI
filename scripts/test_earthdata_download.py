import io
import json
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

from earthdata_download import EarthdataError, choose_data_link, download_selected, parse_bbox, search_granules


class EarthdataDownloadTests(unittest.TestCase):
    def test_bbox_requires_ordered_global_bounds(self):
        self.assertEqual(parse_bbox("75,33,76,34"), "75.0,33.0,76.0,34.0")
        with self.assertRaises(Exception): parse_bbox("76,33,75,34")
        with self.assertRaises(Exception): parse_bbox("NaN,0,1,1")

    def test_only_earthdata_https_links_are_selected(self):
        links = [{"href":"http://earthdata.nasa.gov/a", "rel":"data#"},
                 {"href":"https://example.com/a", "rel":"data#"},
                 {"href":"https://search.earthdata.nasa.gov/granule", "rel":"data#"}]
        self.assertEqual(choose_data_link(links), "https://search.earthdata.nasa.gov/granule")
        with self.assertRaises(EarthdataError): choose_data_link([])

    def test_search_uses_user_selected_constraints_and_bearer_auth(self):
        session = Mock()
        response = Mock(); response.json.return_value = {"feed":{"entry":[{"title":"one"}]}}
        response.raise_for_status.return_value = None; session.get.return_value = response
        rows = search_granules("MOD13Q1", "2024-06-01T00:00:00Z", "2024-06-02T00:00:00Z",
                               "75,33,76,34", "secret-token", 3, session)
        self.assertEqual(rows, [{"title":"one"}])
        args, kwargs = session.get.call_args
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer secret-token")
        self.assertEqual(kwargs["params"]["short_name"], "MOD13Q1")
        self.assertEqual(kwargs["params"]["bounding_box"], "75,33,76,34")

    def test_download_writes_granule_and_provenance_manifest(self):
        session = Mock()
        response = Mock(); response.url = "https://data.earthdata.nasa.gov/granule.h5"
        response.raise_for_status.return_value = None; response.iter_content.return_value = [b"sample", b"-granule"]
        context = Mock(); context.__enter__ = Mock(return_value=response); context.__exit__ = Mock(return_value=False)
        session.get.return_value = context
        entry = {"title":"granule", "time_start":"2024-06-01T00:00:00Z", "links":[
            {"href":response.url, "rel":"data#"}]}
        class MemFile:
            def __init__(self): self.bytes = bytearray()
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def write(self, data): self.bytes.extend(data)
        class MemText(io.StringIO):
            @property
            def bytes(self): return self.getvalue().encode()
        files = {}
        def open_fake(path, mode="r", *args, **kwargs):
            if mode == "xb": files[Path(path).name] = MemFile(); return files[Path(path).name]
            if mode == "w": files[Path(path).name] = MemText(); return files[Path(path).name]
            return MemText()
        with patch("pathlib.Path.open", side_effect=open_fake), \
             patch("pathlib.Path.mkdir"), patch("pathlib.Path.exists", return_value=False), \
             patch("pathlib.Path.resolve", autospec=True, side_effect=lambda self, *a, **k: self):
            manifest = download_selected([entry], Path("virtual-output"), "Landsat/MODIS/VIIRS", "MOD13Q1", "token", session)
        self.assertEqual(bytes(files["granule.h5"].bytes), b"sample-granule")
        self.assertEqual(manifest["downloads"][0]["status"], "downloaded")
        self.assertEqual(json.loads(files["download_manifest.json"].bytes.decode())["provider"],
                         "NASA Earthdata / Common Metadata Repository")


if __name__ == "__main__":
    unittest.main()
