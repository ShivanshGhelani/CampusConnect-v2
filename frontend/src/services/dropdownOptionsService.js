/**
 * Dropdown Options Management Service
 * Manages all dropdown options for the application (frontend-only, no API calls)
 * Only Super Admin can edit these options
 */

class DropdownOptionsService {
  constructor() {
    this.storageKey = 'campusconnect_dropdown_options';
    this.initializeDefaultOptions();
  }

  // Initialize default options if not exists
  initializeDefaultOptions() {
    const existing = this.getFromStorage();
    if (!existing) {
      const defaultOptions = {
        // Student-related options
        student: {
          departments: [
            { value: 'Computer Science & Engineering', label: 'Computer Science & Engineering' },
            { value: 'Information Technology', label: 'Information Technology' },
            { value: 'Electronics & Communication', label: 'Electronics & Communication' },
            { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
            { value: 'Civil Engineering', label: 'Civil Engineering' },
            { value: 'Electrical Engineering', label: 'Electrical Engineering' },
            { value: 'Chemical Engineering', label: 'Chemical Engineering' },
            { value: 'Biotechnology', label: 'Biotechnology' }
          ]
        },
        // Faculty-related options
        faculty: {
          departments: [
            { value: 'Computer Science & Engineering', label: 'Computer Science & Engineering' },
            { value: 'Information Technology', label: 'Information Technology' },
            { value: 'Electronics & Communication', label: 'Electronics & Communication' },
            { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
            { value: 'Civil Engineering', label: 'Civil Engineering' },
            { value: 'Electrical Engineering', label: 'Electrical Engineering' },
            { value: 'Chemical Engineering', label: 'Chemical Engineering' },
            { value: 'Biotechnology', label: 'Biotechnology' },
            { value: 'Mathematics', label: 'Mathematics' },
            { value: 'Physics', label: 'Physics' },
            { value: 'Chemistry', label: 'Chemistry' },
            { value: 'English', label: 'English' },
            { value: 'Management', label: 'Management' }
          ],
          designations: [
            { value: 'Professor', label: 'Professor' },
            { value: 'Associate Professor', label: 'Associate Professor' },
            { value: 'Assistant Professor', label: 'Assistant Professor' },
            { value: 'Lecturer', label: 'Lecturer' },
            { value: 'Senior Lecturer', label: 'Senior Lecturer' },
            { value: 'Head of Department', label: 'Head of Department' },
            { value: 'Dean', label: 'Dean' },
            { value: 'Director', label: 'Director' },
            { value: 'Principal', label: 'Principal' },
            { value: 'Vice Principal', label: 'Vice Principal' }
          ],
          qualifications: [
            { value: 'Ph.D.', label: 'Ph.D. (Doctor of Philosophy)' },
            { value: 'M.Tech', label: 'M.Tech (Master of Technology)' },
            { value: 'M.E.', label: 'M.E. (Master of Engineering)' },
            { value: 'M.Sc.', label: 'M.Sc. (Master of Science)' },
            { value: 'M.A.', label: 'M.A. (Master of Arts)' },
            { value: 'M.Com.', label: 'M.Com. (Master of Commerce)' },
            { value: 'MBA', label: 'MBA (Master of Business Administration)' },
            { value: 'B.Tech', label: 'B.Tech (Bachelor of Technology)' },
            { value: 'B.E.', label: 'B.E. (Bachelor of Engineering)' },
            { value: 'B.Sc.', label: 'B.Sc. (Bachelor of Science)' },
            { value: 'B.A.', label: 'B.A. (Bachelor of Arts)' },
            { value: 'B.Com.', label: 'B.Com. (Bachelor of Commerce)' }
          ]
        }
      };
      
      this.saveToStorage(defaultOptions);
    }
  }

  // Get all options
  getAllOptions() {
    return this.getFromStorage() || {};
  }

  // Get options by category and type
  getOptions(category, type) {
    const options = this.getAllOptions();
    return options[category]?.[type] || [];
  }

  // Add new option
  addOption(category, type, option) {
    const options = this.getAllOptions();
    
    if (!options[category]) {
      options[category] = {};
    }
    
    if (!options[category][type]) {
      options[category][type] = [];
    }
    
    // Check if option already exists
    const exists = options[category][type].some(
      existing => existing.value === option.value
    );
    
    if (!exists) {
      options[category][type].push(option);
      this.saveToStorage(options);
      return true;
    }
    
    return false;
  }

  // Update option
  updateOption(category, type, oldValue, newOption) {
    const options = this.getAllOptions();
    
    if (!options[category]?.[type]) {
      return false;
    }
    
    const index = options[category][type].findIndex(
      option => option.value === oldValue
    );
    
    if (index !== -1) {
      options[category][type][index] = newOption;
      this.saveToStorage(options);
      return true;
    }
    
    return false;
  }

  // Delete option
  deleteOption(category, type, value) {
    const options = this.getAllOptions();
    
    if (!options[category]?.[type]) {
      return false;
    }
    
    const index = options[category][type].findIndex(
      option => option.value === value
    );
    
    if (index !== -1) {
      options[category][type].splice(index, 1);
      this.saveToStorage(options);
      return true;
    }
    
    return false;
  }

  // Reorder options
  reorderOptions(category, type, newOrder) {
    const options = this.getAllOptions();
    
    if (!options[category]) {
      options[category] = {};
    }
    
    options[category][type] = newOrder;
    this.saveToStorage(options);
  }

  // Reset to default options
  resetToDefault() {
    localStorage.removeItem(this.storageKey);
    this.initializeDefaultOptions();
  }

  // Import options from JSON
  importOptions(importedOptions) {
    try {
      // Validate structure
      if (typeof importedOptions !== 'object') {
        throw new Error('Invalid format');
      }
      
      this.saveToStorage(importedOptions);
      return true;
    } catch (error) {
      console.error('Failed to import options:', error);
      return false;
    }
  }

  // Export options to JSON
  exportOptions() {
    return JSON.stringify(this.getAllOptions(), null, 2);
  }

  // Private methods
  getFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get options from storage:', error);
      return null;
    }
  }

  saveToStorage(options) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(options));
    } catch (error) {
      console.error('Failed to save options to storage:', error);
    }
  }

  // Get available categories and types for management interface
  getSchema() {
    return {
      student: {
        name: 'Student Options',
        types: {
          departments: 'Departments'
        }
      },
      faculty: {
        name: 'Faculty Options',
        types: {
          departments: 'Departments',
          designations: 'Designations',
          qualifications: 'Qualifications'
        }
      }
    };
  }
}

// Create singleton instance
const dropdownOptionsService = new DropdownOptionsService();

export default dropdownOptionsService;
