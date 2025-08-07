import React, { useState } from 'react';
import {
  Dropdown,
  SearchBox,
  Modal,
  ConfirmModal,
  Alert,
  useToast,
  Badge,
  StatusBadge,
  RoleBadge,
  CountBadge,
  NotificationBadge,
  Input,
  PasswordInput,
  EmailInput,
  SearchInput,
  TextArea,
  CommentTextArea,
  DescriptionTextArea,
  Breadcrumb,
  AutoBreadcrumb,
  Pagination,
  SimplePagination,
  CompactPagination
} from '../components/ui';

const ComponentShowcase = () => {
  // State for various components
  const [dropdownValue, setDropdownValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [textAreaValue, setTextAreaValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Toast hook
  const { success, error, warning, info } = useToast();

  // Sample data
  const dropdownOptions = [
    { value: 'option1', label: 'Option 1', icon: <i className="fas fa-star text-yellow-500"></i> },
    { value: 'option2', label: 'Option 2', icon: <i className="fas fa-heart text-red-500"></i> },
    { value: 'option3', label: 'Option 3', icon: <i className="fas fa-bookmark text-blue-500"></i> }
  ];

  const breadcrumbItems = [
    { label: 'Home', href: '/', icon: <i className="fas fa-home"></i> },
    { label: 'Components', href: '/components', icon: <i className="fas fa-puzzle-piece"></i> },
    { label: 'UI Library', href: '/components/ui', icon: <i className="fas fa-paint-brush"></i> },
    { label: 'Showcase', active: true, icon: <i className="fas fa-eye"></i> }
  ];

  const searchSuggestions = [
    'React Components',
    'UI Design',
    'Frontend Development',
    'Component Library',
    'Design System'
  ];

  const recentSearches = [
    'Button component',
    'Form validation',
    'Modal dialog'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 CampusConnect UI Component Library
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive collection of reusable, accessible, and beautiful React components
            built with Tailwind CSS for modern web applications.
          </p>
        </div>

        {/* Breadcrumb Demo */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📍 Breadcrumb Navigation</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Default Breadcrumb</h3>
              <Breadcrumb items={breadcrumbItems} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dark Variant</h3>
              <div className="bg-gray-800 p-4 rounded-md">
                <Breadcrumb items={breadcrumbItems} variant="dark" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Components */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔍 Search Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Advanced SearchBox</h3>
              <SearchBox
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search with autocomplete..."
                suggestions={searchSuggestions}
                showSuggestions={true}
                recentSearches={recentSearches}
                showRecentSearches={true}
                showResultCount={true}
                resultCount={42}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Simple Search Input</h3>
              <SearchInput
                placeholder="Simple search..."
                clearable
              />
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📝 Form Inputs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Standard Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helpText="This is a help text"
              />
              <EmailInput
                label="Email Address"
                placeholder="user@example.com"
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Enter password..."
                required
              />
              <Input
                label="Input with Error"
                error="This field is required"
                placeholder="Error state..."
              />
            </div>
            <div className="space-y-4">
              <Dropdown
                label="Dropdown Selection"
                placeholder="Choose an option..."
                options={dropdownOptions}
                value={dropdownValue}
                onChange={setDropdownValue}
                searchable
                clearable
              />
              <TextArea
                label="Standard TextArea"
                placeholder="Enter your message..."
                value={textAreaValue}
                onChange={(e) => setTextAreaValue(e.target.value)}
                showCharCount
                maxLength={200}
              />
              <CommentTextArea
                label="Auto-resize Comment"
                placeholder="Write a comment..."
              />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🏷️ Badges & Status Indicators</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Role Badges</h3>
              <div className="flex flex-wrap gap-2">
                <RoleBadge role="super_admin" />
                <RoleBadge role="executive_admin" />
                <RoleBadge role="content_admin" />
                <RoleBadge role="event_admin" />
                <RoleBadge role="moderator" />
                <RoleBadge role="user" />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status Badges</h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="active" />
                <StatusBadge status="inactive" />
                <StatusBadge status="pending" />
                <StatusBadge status="draft" />
                <StatusBadge status="published" />
                <StatusBadge status="archived" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Color Variants</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="purple">Purple</Badge>
                <Badge variant="pink">Pink</Badge>
                <Badge variant="teal">Teal</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Interactive & Count Badges</h3>
              <div className="flex flex-wrap gap-4">
                <Badge 
                  interactive 
                  onClick={() => info('Badge clicked!')}
                  icon={<i className="fas fa-click"></i>}
                >
                  Clickable
                </Badge>
                <Badge 
                  removable 
                  onRemove={() => warning('Badge removed!')}
                  variant="primary"
                >
                  Removable
                </Badge>
                <NotificationBadge count={5}>
                  <i className="fas fa-bell text-xl text-gray-600"></i>
                </NotificationBadge>
                <CountBadge count={99} />
                <CountBadge count={999} maxCount={99} />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔔 Alerts & Notifications</h2>
          <div className="space-y-4">
            <Alert 
              type="success" 
              title="Success!" 
              message="Your action was completed successfully."
              dismissible
            />
            <Alert 
              type="error" 
              title="Error!" 
              message="Something went wrong. Please try again."
              dismissible
            />
            <Alert 
              type="warning" 
              title="Warning!" 
              message="Please review your input before proceeding."
              dismissible
            />
            <Alert 
              type="info" 
              title="Information" 
              message="Here's some helpful information for you."
              dismissible
            />
            
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Toast Notifications</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => success('Success toast message!')}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Success Toast
                </button>
                <button
                  onClick={() => error('Error toast message!')}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Error Toast
                </button>
                <button
                  onClick={() => warning('Warning toast message!')}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Warning Toast
                </button>
                <button
                  onClick={() => info('Info toast message!')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Info Toast
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">🪟 Modals & Dialogs</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open Modal
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirm Dialog
            </button>
          </div>
        </div>

        {/* Pagination */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">📄 Pagination</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Full Pagination</h3>
              <Pagination
                currentPage={currentPage}
                totalPages={20}
                totalItems={200}
                pageSize={10}
                onPageChange={setCurrentPage}
                showPageSizeSelector
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Simple Pagination</h3>
              <SimplePagination
                currentPage={currentPage}
                totalPages={20}
                onPageChange={setCurrentPage}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Compact Pagination (Mobile)</h3>
              <CompactPagination
                currentPage={currentPage}
                totalPages={20}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>

        {/* Component Stats */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm p-8 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Component Library Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-4xl font-bold">8</div>
                <div className="text-blue-100">Components Built</div>
              </div>
              <div>
                <div className="text-4xl font-bold">50+</div>
                <div className="text-blue-100">Props & Variants</div>
              </div>
              <div>
                <div className="text-4xl font-bold">100%</div>
                <div className="text-blue-100">Accessible</div>
              </div>
              <div>
                <div className="text-4xl font-bold">∞</div>
                <div className="text-blue-100">Possibilities</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Example Modal"
        size="lg"
        headerIcon={<i className="fas fa-info-circle"></i>}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This is an example modal with various features including:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Backdrop blur effect</li>
            <li>Focus management</li>
            <li>Keyboard navigation (ESC to close)</li>
            <li>Multiple sizes available</li>
            <li>Accessible markup</li>
          </ul>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowModal(false);
                success('Modal action completed!');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          error('Action confirmed!');
        }}
        title="Confirm Deletion"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ComponentShowcase;
