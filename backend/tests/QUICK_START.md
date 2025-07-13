# 🧪 CampusConnect Backend Testing - Quick Start Guide

## 🚀 Getting Started

### 1. Install Test Dependencies
```bash
cd backend
pip install -r test-requirements.txt
```

### 2. Run All Tests
```bash
python run_tests.py --all
```

### 3. Generate Test Report
```bash
python run_tests.py --report
```

## 📋 Available Test Commands

### Basic Test Execution
```bash
# Run all tests with coverage
python run_tests.py --all

# Run only unit tests
python run_tests.py --unit

# Run only API tests
python run_tests.py --api

# Run only integration tests
python run_tests.py --integration

# Run fast tests (exclude slow ones)
python run_tests.py --fast
```

### Specific Test Execution
```bash
# Run a specific test file
python run_tests.py --test tests/unit/models/test_student.py

# Run a specific test function
python run_tests.py --test tests/unit/models/test_student.py::TestStudent::test_student_creation_valid_data

# Run tests matching a pattern
pytest -k "test_student" -v
```

### Code Quality
```bash
# Run code linting
python run_tests.py --lint

# Install dependencies and run all tests
python run_tests.py --install-deps --all
```

### Advanced Usage
```bash
# Run tests with verbose output
pytest tests/ -v

# Run tests with coverage report
pytest tests/ --cov=. --cov-report=html

# Run tests in parallel (if pytest-xdist installed)
pytest tests/ -n auto

# Run only failed tests from last run
pytest tests/ --lf

# Run tests and stop on first failure
pytest tests/ -x
```

## 📊 Understanding Test Output

### Test Results
- ✅ **PASSED**: Test completed successfully
- ❌ **FAILED**: Test failed with assertion error
- ⚠️ **SKIPPED**: Test was skipped (marked with @pytest.mark.skip)
- 💥 **ERROR**: Test had an error during execution

### Coverage Report
- **Lines**: Percentage of code lines executed during tests
- **Branches**: Percentage of conditional branches tested
- **Missing**: Lines not covered by tests

### Sample Output
```
================================ test session starts ================================
collected 45 items

tests/unit/models/test_student.py::TestStudent::test_student_creation_valid_data PASSED [ 2%]
tests/unit/models/test_student.py::TestStudent::test_student_creation_invalid_email PASSED [ 4%]
...

============================= 45 passed in 12.34s ===============================

Name                           Stmts   Miss  Cover   Missing
------------------------------------------------------------
models/student.py                 89      5    94%   45-47, 52
services/venue_service.py        156     23    85%   234-245, 267-289
------------------------------------------------------------
TOTAL                           2345    123    95%
```

## 🔧 Configuration Files

### pytest.ini
- Test discovery settings
- Coverage configuration
- Output formatting
- Marker definitions

### conftest.py
- Global test fixtures
- Test environment setup
- Mock configurations
- Shared test utilities

## 🛡️ Safety Features

### Database Protection
- ✅ Tests use mock database (no real MongoDB needed)
- ✅ No production data access
- ✅ Isolated test environment

### External Services
- ✅ Email services are mocked (no real emails sent)
- ✅ File storage is mocked (no cloud uploads)
- ✅ Certificate generation is simulated

## 📈 Test Reports

### HTML Coverage Report
After running tests with coverage:
```
open tests/reports/coverage_html/index.html
```

### Comprehensive Test Report
```bash
python tests/generate_report.py
open tests/reports/test_report.html
```

## 🐛 Troubleshooting

### Common Issues

#### Import Errors
```bash
# Make sure you're in the backend directory
cd backend

# Install all dependencies
pip install -r requirements.txt
pip install -r test-requirements.txt
```

#### Test Discovery Issues
```bash
# Run pytest directly if custom runner fails
pytest tests/ -v
```

#### Coverage Issues
```bash
# Generate coverage report manually
pytest tests/ --cov=. --cov-report=html --cov-report=term
```

#### Mock-related Failures
```bash
# Clear Python cache
find . -type d -name "__pycache__" -delete
find . -name "*.pyc" -delete
```

### Environment Issues
```bash
# Verify Python version (3.9+)
python --version

# Check installed packages
pip list | grep pytest

# Verify test environment
echo $ENVIRONMENT  # Should be 'test'
```

## 📝 Writing New Tests

### Test File Structure
```python
"""
Test description
"""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock

class TestYourComponent:
    """Test cases for YourComponent."""
    
    def test_basic_functionality(self):
        """Test basic functionality."""
        # Arrange
        # Act
        # Assert
        pass
    
    @pytest.mark.asyncio
    async def test_async_functionality(self):
        """Test async functionality."""
        # Your async test here
        pass
```

### Using Fixtures
```python
def test_with_mock_db(self, mock_database):
    """Test using mock database."""
    # Use mock_database fixture
    pass

def test_with_sample_data(self, sample_student_data):
    """Test using sample data."""
    # Use pre-configured test data
    pass
```

### Marking Tests
```python
@pytest.mark.slow
def test_slow_operation():
    """Mark as slow test."""
    pass

@pytest.mark.integration
def test_integration_scenario():
    """Mark as integration test."""
    pass
```

## 🎯 Best Practices

1. **Test Names**: Use descriptive names explaining what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **One Assertion**: Focus each test on one behavior
4. **Mock External Services**: Don't rely on external systems
5. **Clean Test Data**: Use fresh data for each test
6. **Fast Execution**: Keep tests quick for developer productivity

## 📞 Support

For issues with the test suite:
1. Check this guide first
2. Review test logs for specific error messages
3. Verify environment setup
4. Check that all dependencies are installed

Happy Testing! 🎉
