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

```bash
flutter pub add flutter_bloc
flutter pub add equatable
flutter pub add dio
flutter pub add get_it

flutter pub add dev:mockito
flutter pub add dev:bloc_test
flutter pub add dev:build_runner
```
