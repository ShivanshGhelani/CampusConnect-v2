// Shared EventRegistration Components
// These components are configured to work with both Student and Faculty user types
// Pass userType='student' or userType='faculty' as props

export { default as AlreadyRegistered } from './AlreadyRegistered';
export { default as NotRegistered } from './NotRegistered';
export { default as RegistrationSuccess } from './RegistrationSuccess';
export { default as IndividualRegistration } from './IndividualRegistration';
export { default as TeamRegistration } from './TeamRegistration';

// Example usage:
// import { AlreadyRegistered } from '../../../components/EventRegistration';
// <AlreadyRegistered userType="student" />
// <AlreadyRegistered userType="faculty" />
