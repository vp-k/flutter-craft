# Authentication Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use flutter-craft:flutter-executing to implement this plan task-by-task.

**Goal:** Implement user login/logout with BLoC state management

**Architecture:** Clean Architecture with BLoC

**Dependencies:** flutter_bloc, equatable, dio, get_it, mockito, bloc_test

---

## Domain Layer

### Task 1: User Entity

**Layer:** Domain

**Files:**
- Create: `lib/features/auth/domain/entities/user.dart`

**Implementation:**

```dart
import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String name;

  const User({
    required this.id,
    required this.email,
    required this.name,
  });

  @override
  List<Object?> get props => [id, email, name];
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/domain/entities/
```

**Commit:** `feat(auth): add User entity`

---

### Task 2: AuthRepository Interface

**Layer:** Domain

**Files:**
- Create: `lib/features/auth/domain/repositories/auth_repository.dart`

**Implementation:**

```dart
import '../entities/user.dart';

abstract class AuthRepository {
  Future<User> login(String email, String password);
  Future<void> logout();
  Future<User?> getCurrentUser();
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/domain/repositories/
```

**Commit:** `feat(auth): add AuthRepository interface`

---

## Data Layer

### Task 3: UserModel

**Layer:** Data

**Files:**
- Create: `lib/features/auth/data/models/user_model.dart`

**Implementation:**

```dart
import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
    };
  }
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/data/models/
```

**Commit:** `feat(auth): add UserModel with JSON serialization`

---

### Task 4: AuthRemoteDataSource

**Layer:** Data

**Files:**
- Create: `lib/features/auth/data/datasources/auth_remote_datasource.dart`

**Implementation:**

```dart
import 'package:dio/dio.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> login(String email, String password);
  Future<void> logout();
  Future<UserModel?> getCurrentUser();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;

  AuthRemoteDataSourceImpl({required this.dio});

  @override
  Future<UserModel> login(String email, String password) async {
    final response = await dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return UserModel.fromJson(response.data);
  }

  @override
  Future<void> logout() async {
    await dio.post('/auth/logout');
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    try {
      final response = await dio.get('/auth/me');
      return UserModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/data/datasources/
```

**Commit:** `feat(auth): add AuthRemoteDataSource`

---

### Task 5: AuthRepositoryImpl

**Layer:** Data

**Files:**
- Create: `lib/features/auth/data/repositories/auth_repository_impl.dart`

**Implementation:**

```dart
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;

  AuthRepositoryImpl({required this.remoteDataSource});

  @override
  Future<User> login(String email, String password) {
    return remoteDataSource.login(email, password);
  }

  @override
  Future<void> logout() {
    return remoteDataSource.logout();
  }

  @override
  Future<User?> getCurrentUser() {
    return remoteDataSource.getCurrentUser();
  }
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/data/repositories/
```

**Commit:** `feat(auth): add AuthRepositoryImpl`

---

## Presentation Layer

### Task 6: AuthBloc Events & States

**Layer:** Presentation

**Files:**
- Create: `lib/features/auth/presentation/bloc/auth_event.dart`
- Create: `lib/features/auth/presentation/bloc/auth_state.dart`

**Implementation (auth_event.dart):**

```dart
import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class LogoutRequested extends AuthEvent {}

class CheckAuthStatus extends AuthEvent {}
```

**Implementation (auth_state.dart):**

```dart
import 'package:equatable/equatable.dart';
import '../../domain/entities/user.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final User user;

  const Authenticated(this.user);

  @override
  List<Object?> get props => [user];
}

class Unauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/presentation/bloc/
```

**Commit:** `feat(auth): add AuthBloc events and states`

---

### Task 7: AuthBloc

**Layer:** Presentation

**Files:**
- Create: `lib/features/auth/presentation/bloc/auth_bloc.dart`

**Implementation:**

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;

  AuthBloc({required this.authRepository}) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<CheckAuthStatus>(_onCheckAuthStatus);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await authRepository.login(event.email, event.password);
      emit(Authenticated(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await authRepository.logout();
      emit(Unauthenticated());
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatus event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    final user = await authRepository.getCurrentUser();
    if (user != null) {
      emit(Authenticated(user));
    } else {
      emit(Unauthenticated());
    }
  }
}
```

**Verification:**

```bash
flutter analyze lib/features/auth/presentation/bloc/
```

**Commit:** `feat(auth): add AuthBloc`

---

## Testing

### Task 8: AuthRepositoryImpl Unit Tests

**Layer:** Test (Priority 1)

**Files:**
- Create: `test/features/auth/data/repositories/auth_repository_impl_test.dart`

**Implementation:**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

// Import your actual paths
// import 'package:your_app/features/auth/data/repositories/auth_repository_impl.dart';
// import 'package:your_app/features/auth/data/datasources/auth_remote_datasource.dart';
// import 'package:your_app/features/auth/data/models/user_model.dart';

@GenerateMocks([AuthRemoteDataSource])
void main() {
  // late AuthRepositoryImpl repository;
  // late MockAuthRemoteDataSource mockDataSource;

  // setUp(() {
  //   mockDataSource = MockAuthRemoteDataSource();
  //   repository = AuthRepositoryImpl(remoteDataSource: mockDataSource);
  // });

  group('login', () {
    test('should return User when login succeeds', () async {
      // Arrange
      // when(mockDataSource.login(any, any))
      //     .thenAnswer((_) async => tUserModel);

      // Act
      // final result = await repository.login('test@test.com', 'password');

      // Assert
      // expect(result, equals(tUser));
    });
  });
}
```

**Verification:**

```bash
flutter test test/features/auth/data/repositories/
```

**Commit:** `test(auth): add AuthRepositoryImpl unit tests`

---

### Task 9: AuthBloc Unit Tests

**Layer:** Test (Priority 2)

**Files:**
- Create: `test/features/auth/presentation/bloc/auth_bloc_test.dart`

**Implementation:**

```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

// Import your actual paths

@GenerateMocks([AuthRepository])
void main() {
  // late AuthBloc bloc;
  // late MockAuthRepository mockRepository;

  // setUp(() {
  //   mockRepository = MockAuthRepository();
  //   bloc = AuthBloc(authRepository: mockRepository);
  // });

  // tearDown(() {
  //   bloc.close();
  // });

  test('initial state should be AuthInitial', () {
    // expect(bloc.state, equals(AuthInitial()));
  });

  // blocTest<AuthBloc, AuthState>(
  //   'should emit [Loading, Authenticated] when login succeeds',
  //   build: () {
  //     when(mockRepository.login(any, any))
  //         .thenAnswer((_) async => tUser);
  //     return bloc;
  //   },
  //   act: (bloc) => bloc.add(LoginRequested(email: 'test@test.com', password: 'pass')),
  //   expect: () => [AuthLoading(), Authenticated(tUser)],
  // );
}
```

**Verification:**

```bash
flutter test test/features/auth/presentation/bloc/
```

**Commit:** `test(auth): add AuthBloc unit tests`

---

## Summary

| Task | Layer | Files | Status |
|------|-------|-------|--------|
| 1 | Domain | User entity | Pending |
| 2 | Domain | AuthRepository interface | Pending |
| 3 | Data | UserModel | Pending |
| 4 | Data | AuthRemoteDataSource | Pending |
| 5 | Data | AuthRepositoryImpl | Pending |
| 6 | Presentation | AuthBloc events/states | Pending |
| 7 | Presentation | AuthBloc | Pending |
| 8 | Test | Repository tests | Pending |
| 9 | Test | BLoC tests | Pending |
