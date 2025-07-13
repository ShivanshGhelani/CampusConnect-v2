"""
Test Report Generator for CampusConnect Backend
Generates a comprehensive report of test results and coverage
"""
import os
import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


class TestReportGenerator:
    """Generates comprehensive test reports."""
    
    def __init__(self, reports_dir: str = "tests/reports"):
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.report_data = {
            "generated_at": datetime.now().isoformat(),
            "test_summary": {},
            "coverage_summary": {},
            "test_categories": {},
            "failed_tests": [],
            "recommendations": []
        }
    
    def run_tests_and_collect_data(self):
        """Run tests and collect data for reporting."""
        print("Running comprehensive test suite...")
        
        # Run all tests with coverage and XML output
        cmd = [
            "python", "-m", "pytest",
            "tests/",
            "--cov=.",
            "--cov-report=xml:tests/reports/coverage.xml",
            "--cov-report=html:tests/reports/coverage_html",
            "--junit-xml=tests/reports/junit.xml",
            "-v",
            "--tb=short"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            self.report_data["test_execution"] = {
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            self.report_data["test_execution"] = {
                "exit_code": -1,
                "error": "Test execution timed out after 5 minutes"
            }
            return False
    
    def parse_junit_results(self):
        """Parse JUnit XML results."""
        junit_file = self.reports_dir / "junit.xml"
        if not junit_file.exists():
            return
        
        try:
            tree = ET.parse(junit_file)
            root = tree.getroot()
            
            # Parse test suite summary
            testsuite = root.find('.//testsuite')
            if testsuite is not None:
                self.report_data["test_summary"] = {
                    "total_tests": int(testsuite.get("tests", 0)),
                    "failures": int(testsuite.get("failures", 0)),
                    "errors": int(testsuite.get("errors", 0)),
                    "skipped": int(testsuite.get("skipped", 0)),
                    "time": float(testsuite.get("time", 0)),
                }
                
                # Calculate success rate
                total = self.report_data["test_summary"]["total_tests"]
                failed = self.report_data["test_summary"]["failures"] + self.report_data["test_summary"]["errors"]
                self.report_data["test_summary"]["success_rate"] = ((total - failed) / total * 100) if total > 0 else 0
            
            # Parse failed tests
            failed_tests = []
            for testcase in root.findall('.//testcase'):
                failure = testcase.find('failure')
                error = testcase.find('error')
                
                if failure is not None or error is not None:
                    failed_test = {
                        "name": testcase.get("name"),
                        "classname": testcase.get("classname"),
                        "time": float(testcase.get("time", 0)),
                        "failure_message": failure.text if failure is not None else None,
                        "error_message": error.text if error is not None else None
                    }
                    failed_tests.append(failed_test)
            
            self.report_data["failed_tests"] = failed_tests
            
        except ET.ParseError as e:
            print(f"Error parsing JUnit XML: {e}")
    
    def parse_coverage_results(self):
        """Parse coverage XML results."""
        coverage_file = self.reports_dir / "coverage.xml"
        if not coverage_file.exists():
            return
        
        try:
            tree = ET.parse(coverage_file)
            root = tree.getroot()
            
            # Parse overall coverage
            coverage_elem = root.find('.//coverage')
            if coverage_elem is not None:
                self.report_data["coverage_summary"] = {
                    "line_rate": float(coverage_elem.get("line-rate", 0)) * 100,
                    "branch_rate": float(coverage_elem.get("branch-rate", 0)) * 100,
                    "lines_covered": int(coverage_elem.get("lines-covered", 0)),
                    "lines_valid": int(coverage_elem.get("lines-valid", 0)),
                    "branches_covered": int(coverage_elem.get("branches-covered", 0)),
                    "branches_valid": int(coverage_elem.get("branches-valid", 0))
                }
            
            # Parse package-level coverage
            packages = []
            for package in root.findall('.//package'):
                package_data = {
                    "name": package.get("name"),
                    "line_rate": float(package.get("line-rate", 0)) * 100,
                    "branch_rate": float(package.get("branch-rate", 0)) * 100,
                    "classes": []
                }
                
                for class_elem in package.findall('.//class'):
                    class_data = {
                        "name": class_elem.get("name"),
                        "filename": class_elem.get("filename"),
                        "line_rate": float(class_elem.get("line-rate", 0)) * 100,
                        "branch_rate": float(class_elem.get("branch-rate", 0)) * 100
                    }
                    package_data["classes"].append(class_data)
                
                packages.append(package_data)
            
            self.report_data["coverage_by_package"] = packages
            
        except ET.ParseError as e:
            print(f"Error parsing coverage XML: {e}")
    
    def categorize_tests(self):
        """Categorize tests by type and location."""
        test_categories = {
            "unit_tests": {"count": 0, "files": []},
            "integration_tests": {"count": 0, "files": []},
            "api_tests": {"count": 0, "files": []},
            "service_tests": {"count": 0, "files": []},
            "model_tests": {"count": 0, "files": []}
        }
        
        # Count test files by category
        tests_dir = Path("tests")
        
        if (tests_dir / "unit").exists():
            unit_files = list((tests_dir / "unit").rglob("test_*.py"))
            test_categories["unit_tests"]["count"] = len(unit_files)
            test_categories["unit_tests"]["files"] = [str(f) for f in unit_files]
        
        if (tests_dir / "integration").exists():
            integration_files = list((tests_dir / "integration").rglob("test_*.py"))
            test_categories["integration_tests"]["count"] = len(integration_files)
            test_categories["integration_tests"]["files"] = [str(f) for f in integration_files]
        
        if (tests_dir / "api").exists():
            api_files = list((tests_dir / "api").rglob("test_*.py"))
            test_categories["api_tests"]["count"] = len(api_files)
            test_categories["api_tests"]["files"] = [str(f) for f in api_files]
        
        # Count service and model tests
        unit_dir = tests_dir / "unit"
        if unit_dir.exists():
            service_files = list((unit_dir / "services").rglob("test_*.py")) if (unit_dir / "services").exists() else []
            model_files = list((unit_dir / "models").rglob("test_*.py")) if (unit_dir / "models").exists() else []
            
            test_categories["service_tests"]["count"] = len(service_files)
            test_categories["service_tests"]["files"] = [str(f) for f in service_files]
            
            test_categories["model_tests"]["count"] = len(model_files)
            test_categories["model_tests"]["files"] = [str(f) for f in model_files]
        
        self.report_data["test_categories"] = test_categories
    
    def generate_recommendations(self):
        """Generate recommendations based on test results."""
        recommendations = []
        
        # Coverage recommendations
        coverage = self.report_data.get("coverage_summary", {})
        line_rate = coverage.get("line_rate", 0)
        
        if line_rate < 70:
            recommendations.append({
                "type": "coverage",
                "priority": "high",
                "message": f"Code coverage is {line_rate:.1f}%. Aim for at least 70% coverage.",
                "action": "Add more unit tests for uncovered code paths."
            })
        elif line_rate < 85:
            recommendations.append({
                "type": "coverage",
                "priority": "medium",
                "message": f"Code coverage is {line_rate:.1f}%. Consider increasing to 85%+.",
                "action": "Focus on testing edge cases and error conditions."
            })
        
        # Test failure recommendations
        test_summary = self.report_data.get("test_summary", {})
        failure_rate = (test_summary.get("failures", 0) + test_summary.get("errors", 0)) / max(test_summary.get("total_tests", 1), 1) * 100
        
        if failure_rate > 5:
            recommendations.append({
                "type": "failures",
                "priority": "high",
                "message": f"{failure_rate:.1f}% of tests are failing.",
                "action": "Fix failing tests immediately to maintain code quality."
            })
        
        # Test organization recommendations
        categories = self.report_data.get("test_categories", {})
        unit_count = categories.get("unit_tests", {}).get("count", 0)
        integration_count = categories.get("integration_tests", {}).get("count", 0)
        
        if unit_count == 0:
            recommendations.append({
                "type": "organization",
                "priority": "medium",
                "message": "No unit tests found.",
                "action": "Create unit tests for core business logic and utilities."
            })
        
        if integration_count == 0:
            recommendations.append({
                "type": "organization",
                "priority": "medium",
                "message": "No integration tests found.",
                "action": "Create integration tests for API endpoints and workflows."
            })
        
        # Performance recommendations
        if test_summary.get("time", 0) > 60:
            recommendations.append({
                "type": "performance",
                "priority": "low",
                "message": f"Test suite takes {test_summary.get('time', 0):.1f} seconds to run.",
                "action": "Consider optimizing slow tests or using test parallelization."
            })
        
        self.report_data["recommendations"] = recommendations
    
    def generate_html_report(self):
        """Generate HTML report."""
        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>CampusConnect Backend Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
        .info { color: #3498db; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #34495e; color: white; }
        tr:hover { background-color: #f5f5f5; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .recommendation.high { border-color: #e74c3c; background: #ffeaea; }
        .recommendation.medium { border-color: #f39c12; background: #fff8e1; }
        .recommendation.low { border-color: #3498db; background: #e3f2fd; }
        .failed-test { background: #ffeaea; border-left: 4px solid #e74c3c; padding: 10px; margin: 5px 0; }
        .coverage-bar { background: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #e74c3c 0%, #f39c12 50%, #27ae60 100%); }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 CampusConnect Backend Test Report</h1>
        <p class="timestamp">Generated: {generated_at}</p>
        
        <h2>📊 Test Summary</h2>
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value info">{total_tests}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value {success_class}">{success_rate:.1f}%</div>
            </div>
            <div class="metric">
                <h3>Coverage</h3>
                <div class="value {coverage_class}">{coverage:.1f}%</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: {coverage:.1f}%"></div>
                </div>
            </div>
            <div class="metric">
                <h3>Execution Time</h3>
                <div class="value info">{execution_time:.1f}s</div>
            </div>
        </div>
        
        <h2>📈 Test Categories</h2>
        <table>
            <tr><th>Category</th><th>Count</th><th>Description</th></tr>
            <tr><td>Unit Tests</td><td>{unit_count}</td><td>Tests for individual components and functions</td></tr>
            <tr><td>Integration Tests</td><td>{integration_count}</td><td>Tests for component interactions and workflows</td></tr>
            <tr><td>API Tests</td><td>{api_count}</td><td>Tests for REST API endpoints</td></tr>
            <tr><td>Service Tests</td><td>{service_count}</td><td>Tests for business logic services</td></tr>
            <tr><td>Model Tests</td><td>{model_count}</td><td>Tests for data models and validation</td></tr>
        </table>
        
        {failed_tests_section}
        
        <h2>💡 Recommendations</h2>
        {recommendations_html}
        
        <h2>📋 Coverage Details</h2>
        <p>Line Coverage: {coverage:.1f}% ({lines_covered}/{lines_valid} lines)</p>
        <p>Branch Coverage: {branch_coverage:.1f}% ({branches_covered}/{branches_valid} branches)</p>
        
        <h2>🔗 Additional Reports</h2>
        <ul>
            <li><a href="coverage_html/index.html">Detailed HTML Coverage Report</a></li>
            <li><a href="coverage.xml">Coverage XML Report</a></li>
            <li><a href="junit.xml">JUnit XML Report</a></li>
        </ul>
    </div>
</body>
</html>
        """
        
        # Prepare template variables
        test_summary = self.report_data.get("test_summary", {})
        coverage_summary = self.report_data.get("coverage_summary", {})
        categories = self.report_data.get("test_categories", {})
        
        success_rate = test_summary.get("success_rate", 0)
        coverage = coverage_summary.get("line_rate", 0)
        
        # Determine CSS classes based on values
        success_class = "success" if success_rate >= 95 else "warning" if success_rate >= 80 else "error"
        coverage_class = "success" if coverage >= 85 else "warning" if coverage >= 70 else "error"
        
        # Generate failed tests section
        failed_tests_html = ""
        if self.report_data.get("failed_tests"):
            failed_tests_html = "<h2>❌ Failed Tests</h2>"
            for test in self.report_data["failed_tests"]:
                failed_tests_html += f"""
                <div class="failed-test">
                    <strong>{test['classname']}.{test['name']}</strong><br>
                    <small>Time: {test['time']:.3f}s</small><br>
                    {test.get('failure_message', test.get('error_message', 'Unknown error'))[:200]}...
                </div>
                """
        
        # Generate recommendations HTML
        recommendations_html = ""
        for rec in self.report_data.get("recommendations", []):
            recommendations_html += f"""
            <div class="recommendation {rec['priority']}">
                <strong>{rec['type'].title()} - {rec['priority'].title()} Priority</strong><br>
                {rec['message']}<br>
                <em>Action: {rec['action']}</em>
            </div>
            """
        
        # Fill template
        html_content = html_template.format(
            generated_at=self.report_data["generated_at"],
            total_tests=test_summary.get("total_tests", 0),
            success_rate=success_rate,
            success_class=success_class,
            coverage=coverage,
            coverage_class=coverage_class,
            execution_time=test_summary.get("time", 0),
            unit_count=categories.get("unit_tests", {}).get("count", 0),
            integration_count=categories.get("integration_tests", {}).get("count", 0),
            api_count=categories.get("api_tests", {}).get("count", 0),
            service_count=categories.get("service_tests", {}).get("count", 0),
            model_count=categories.get("model_tests", {}).get("count", 0),
            failed_tests_section=failed_tests_html,
            recommendations_html=recommendations_html,
            lines_covered=coverage_summary.get("lines_covered", 0),
            lines_valid=coverage_summary.get("lines_valid", 0),
            branch_coverage=coverage_summary.get("branch_rate", 0),
            branches_covered=coverage_summary.get("branches_covered", 0),
            branches_valid=coverage_summary.get("branches_valid", 0)
        )
        
        # Write HTML file
        html_file = self.reports_dir / "test_report.html"
        html_file.write_text(html_content, encoding="utf-8")
        
        return str(html_file)
    
    def generate_json_report(self):
        """Generate JSON report."""
        json_file = self.reports_dir / "test_report.json"
        with json_file.open("w", encoding="utf-8") as f:
            json.dump(self.report_data, f, indent=2, default=str)
        
        return str(json_file)
    
    def generate_full_report(self):
        """Generate complete test report."""
        print("🧪 Generating comprehensive test report...")
        
        # Run tests and collect data
        success = self.run_tests_and_collect_data()
        
        # Parse results
        self.parse_junit_results()
        self.parse_coverage_results()
        self.categorize_tests()
        self.generate_recommendations()
        
        # Generate reports
        html_file = self.generate_html_report()
        json_file = self.generate_json_report()
        
        print(f"\n📊 Test Report Generated:")
        print(f"  • HTML Report: {html_file}")
        print(f"  • JSON Report: {json_file}")
        print(f"  • Coverage HTML: {self.reports_dir}/coverage_html/index.html")
        
        # Print summary
        test_summary = self.report_data.get("test_summary", {})
        coverage_summary = self.report_data.get("coverage_summary", {})
        
        print(f"\n📈 Summary:")
        print(f"  • Tests: {test_summary.get('total_tests', 0)} total, {test_summary.get('success_rate', 0):.1f}% success")
        print(f"  • Coverage: {coverage_summary.get('line_rate', 0):.1f}% line coverage")
        print(f"  • Recommendations: {len(self.report_data.get('recommendations', []))} items")
        
        return success


if __name__ == "__main__":
    generator = TestReportGenerator()
    success = generator.generate_full_report()
    exit(0 if success else 1)
