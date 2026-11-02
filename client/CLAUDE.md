# Client (Role A)
- React function components + hooks only. Tailwind for styling.
- All HTTP goes through src/api.js (adds Bearer token, logs out on 401).
- Base URL from import.meta.env.VITE_API_URL.
- Mock data in src/mocks/ must match docs/api-contract.md exactly.
- Every page: loading, empty and error state.
- Role-based UI uses the useRole hook. UI hiding is cosmetic;
  the server enforces permissions.
- Do not edit anything in /server.
