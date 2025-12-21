# Sample Authentication Feature Design

## Overview

A simple authentication feature to demonstrate flutter-craft workflow.

## User Stories

- As a user, I want to log in with email/password
- As a user, I want to see my profile after login
- As a user, I want to log out

## Clean Architecture

### Domain Layer

**Entities:**
- `User` - id, email, name

**Repository Interfaces:**
- `AuthRepository` - login, logout, getCurrentUser

### Data Layer

**Models:**
- `UserModel` - extends User with fromJson/toJson

**DataSources:**
- `AuthRemoteDataSource` - API calls

**Repository Implementation:**
- `AuthRepositoryImpl` - implements AuthRepository

### Presentation Layer

**State Management:** BLoC

**BLoC:**
- `AuthBloc` - handles auth state
- Events: LoginRequested, LogoutRequested, CheckAuthStatus
- States: AuthInitial, AuthLoading, Authenticated, Unauthenticated, AuthError

**Screens:**
- `LoginScreen` - email/password form
- `HomeScreen` - shows user info, logout button

## Data Flow

```
User taps Login
    ↓
LoginScreen dispatches LoginRequested to AuthBloc
    ↓
AuthBloc calls AuthRepository.login()
    ↓
AuthRepositoryImpl calls AuthRemoteDataSource.login()
    ↓
API returns UserModel
    ↓
AuthBloc emits Authenticated(user)
    ↓
UI navigates to HomeScreen
```

## Testing Plan

- Priority 1: AuthRepositoryImpl unit tests
- Priority 2: AuthBloc unit tests
- Priority 3: LoginScreen widget tests (optional)

## Dependencies

```yaml
dependencies:
  flutter_bloc: ^8.1.6
  equatable: ^2.0.5
  dio: ^5.4.0
  get_it: ^7.6.4

dev_dependencies:
  mockito: ^5.4.5
  bloc_test: ^9.1.7
  build_runner: ^2.4.8
```
