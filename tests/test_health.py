import unittest
from io import BytesIO
from zipfile import ZipFile

from app import app


class HealthEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_endpoint(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'ok')

    def test_report_contains_executive_sections(self):
        response = self.client.get('/api/processos/relatorio-docx')
        self.assertEqual(response.status_code, 200)

        with ZipFile(BytesIO(response.data)) as archive:
            xml = archive.read('word/document.xml').decode('utf-8')

        self.assertIn('Resumo Executivo', xml)
        self.assertIn('Demonstrativo de Metas', xml)


if __name__ == '__main__':
    unittest.main()
