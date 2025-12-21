# Stateful Pattern Template

상태 필드가 있는 엔티티 CRUD 패턴. 예: Todo, Task, Order

## Entity

```dart
// lib/features/task/domain/entities/task.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'task.freezed.dart';
part 'task.g.dart';

enum TaskStatus {
  pending,
  inProgress,
  completed,
  cancelled,
}

enum TaskPriority {
  low,
  medium,
  high,
}

@freezed
sealed class Task with _$Task {
  const factory Task({
    required String id,
    required String title,
    required String description,
    @Default(TaskStatus.pending) TaskStatus status,
    @Default(TaskPriority.medium) TaskPriority priority,
    DateTime? dueDate,
    required DateTime createdAt,
    DateTime? completedAt,
  }) = _Task;

  factory Task.fromJson(Map<String, dynamic> json) => _$TaskFromJson(json);
}

extension TaskX on Task {
  bool get isCompleted => status == TaskStatus.completed;
  bool get isOverdue => dueDate != null && dueDate!.isBefore(DateTime.now()) && !isCompleted;

  Task complete() => copyWith(
    status: TaskStatus.completed,
    completedAt: DateTime.now(),
  );

  Task cancel() => copyWith(status: TaskStatus.cancelled);

  Task start() => copyWith(status: TaskStatus.inProgress);
}
```

## Drift Table

```dart
// lib/core/database/tables/tasks_table.dart
import 'package:drift/drift.dart';

class Tasks extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get description => text()();
  IntColumn get status => integer().withDefault(const Constant(0))();
  IntColumn get priority => integer().withDefault(const Constant(1))();
  DateTimeColumn get dueDate => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get completedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Model (Data Layer)

```dart
// lib/features/task/data/models/task_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/task.dart';

part 'task_model.freezed.dart';
part 'task_model.g.dart';

@freezed
sealed class TaskModel with _$TaskModel {
  const TaskModel._();

  const factory TaskModel({
    required String id,
    required String title,
    required String description,
    required int status,
    required int priority,
    DateTime? dueDate,
    required DateTime createdAt,
    DateTime? completedAt,
  }) = _TaskModel;

  factory TaskModel.fromJson(Map<String, dynamic> json) => _$TaskModelFromJson(json);

  factory TaskModel.fromEntity(Task entity) => TaskModel(
    id: entity.id,
    title: entity.title,
    description: entity.description,
    status: entity.status.index,
    priority: entity.priority.index,
    dueDate: entity.dueDate,
    createdAt: entity.createdAt,
    completedAt: entity.completedAt,
  );

  Task toEntity() => Task(
    id: id,
    title: title,
    description: description,
    status: TaskStatus.values[status],
    priority: TaskPriority.values[priority],
    dueDate: dueDate,
    createdAt: createdAt,
    completedAt: completedAt,
  );
}
```

## Repository Interface

```dart
// lib/features/task/domain/repositories/task_repository.dart
import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/task.dart';

abstract class TaskRepository {
  Future<Either<Failure, List<Task>>> getTasks();
  Future<Either<Failure, List<Task>>> getTasksByStatus(TaskStatus status);
  Future<Either<Failure, Task>> getTaskById(String id);
  Future<Either<Failure, Task>> createTask(Task task);
  Future<Either<Failure, Task>> updateTask(Task task);
  Future<Either<Failure, Task>> updateTaskStatus(String id, TaskStatus status);
  Future<Either<Failure, Unit>> deleteTask(String id);
  Future<Either<Failure, int>> getCompletedCount();
  Future<Either<Failure, int>> getPendingCount();
}
```

## Local DataSource

```dart
// lib/features/task/data/datasources/task_local_datasource.dart
import 'package:injectable/injectable.dart';
import '../../../../core/database/app_database.dart';
import '../models/task_model.dart';

abstract class TaskLocalDataSource {
  Future<List<TaskModel>> getTasks();
  Future<List<TaskModel>> getTasksByStatus(int status);
  Future<TaskModel?> getTaskById(String id);
  Future<TaskModel> createTask(TaskModel task);
  Future<TaskModel> updateTask(TaskModel task);
  Future<void> updateTaskStatus(String id, int status, DateTime? completedAt);
  Future<void> deleteTask(String id);
  Future<int> getCountByStatus(int status);
}

@Injectable(as: TaskLocalDataSource)
class TaskLocalDataSourceImpl implements TaskLocalDataSource {
  final AppDatabase _db;

  TaskLocalDataSourceImpl(this._db);

  @override
  Future<List<TaskModel>> getTasks() async {
    final results = await (_db.select(_db.tasks)
      ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
      .get();
    return results.map((row) => TaskModel(
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    )).toList();
  }

  @override
  Future<List<TaskModel>> getTasksByStatus(int status) async {
    final results = await (_db.select(_db.tasks)
      ..where((t) => t.status.equals(status))
      ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
      .get();
    return results.map((row) => TaskModel(
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    )).toList();
  }

  @override
  Future<TaskModel?> getTaskById(String id) async {
    final result = await (_db.select(_db.tasks)
      ..where((t) => t.id.equals(id)))
      .getSingleOrNull();
    if (result == null) return null;
    return TaskModel(
      id: result.id,
      title: result.title,
      description: result.description,
      status: result.status,
      priority: result.priority,
      dueDate: result.dueDate,
      createdAt: result.createdAt,
      completedAt: result.completedAt,
    );
  }

  @override
  Future<TaskModel> createTask(TaskModel task) async {
    await _db.into(_db.tasks).insert(TasksCompanion.insert(
      id: task.id,
      title: task.title,
      description: task.description,
      status: Value(task.status),
      priority: Value(task.priority),
      dueDate: Value(task.dueDate),
      createdAt: task.createdAt,
      completedAt: Value(task.completedAt),
    ));
    return task;
  }

  @override
  Future<TaskModel> updateTask(TaskModel task) async {
    await (_db.update(_db.tasks)..where((t) => t.id.equals(task.id)))
      .write(TasksCompanion(
        title: Value(task.title),
        description: Value(task.description),
        status: Value(task.status),
        priority: Value(task.priority),
        dueDate: Value(task.dueDate),
        completedAt: Value(task.completedAt),
      ));
    return task;
  }

  @override
  Future<void> updateTaskStatus(String id, int status, DateTime? completedAt) async {
    await (_db.update(_db.tasks)..where((t) => t.id.equals(id)))
      .write(TasksCompanion(
        status: Value(status),
        completedAt: Value(completedAt),
      ));
  }

  @override
  Future<void> deleteTask(String id) async {
    await (_db.delete(_db.tasks)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<int> getCountByStatus(int status) async {
    final count = await (_db.select(_db.tasks)
      ..where((t) => t.status.equals(status)))
      .get();
    return count.length;
  }
}
```

## Repository Implementation

```dart
// lib/features/task/data/repositories/task_repository_impl.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/task.dart';
import '../../domain/repositories/task_repository.dart';
import '../datasources/task_local_datasource.dart';
import '../models/task_model.dart';

@Injectable(as: TaskRepository)
class TaskRepositoryImpl implements TaskRepository {
  final TaskLocalDataSource _localDataSource;

  TaskRepositoryImpl(this._localDataSource);

  @override
  Future<Either<Failure, List<Task>>> getTasks() async {
    try {
      final models = await _localDataSource.getTasks();
      return Right(models.map((m) => m.toEntity()).toList());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<Task>>> getTasksByStatus(TaskStatus status) async {
    try {
      final models = await _localDataSource.getTasksByStatus(status.index);
      return Right(models.map((m) => m.toEntity()).toList());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Task>> getTaskById(String id) async {
    try {
      final model = await _localDataSource.getTaskById(id);
      if (model == null) {
        return const Left(Failure.cache(message: 'Task not found'));
      }
      return Right(model.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Task>> createTask(Task task) async {
    try {
      final model = TaskModel.fromEntity(task);
      final created = await _localDataSource.createTask(model);
      return Right(created.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Task>> updateTask(Task task) async {
    try {
      final model = TaskModel.fromEntity(task);
      final updated = await _localDataSource.updateTask(model);
      return Right(updated.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Task>> updateTaskStatus(String id, TaskStatus status) async {
    try {
      final completedAt = status == TaskStatus.completed ? DateTime.now() : null;
      await _localDataSource.updateTaskStatus(id, status.index, completedAt);
      final model = await _localDataSource.getTaskById(id);
      if (model == null) {
        return const Left(Failure.cache(message: 'Task not found'));
      }
      return Right(model.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteTask(String id) async {
    try {
      await _localDataSource.deleteTask(id);
      return const Right(unit);
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, int>> getCompletedCount() async {
    try {
      final count = await _localDataSource.getCountByStatus(TaskStatus.completed.index);
      return Right(count);
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, int>> getPendingCount() async {
    try {
      final count = await _localDataSource.getCountByStatus(TaskStatus.pending.index);
      return Right(count);
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }
}
```

## UseCases

```dart
// lib/features/task/domain/usecases/get_tasks.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/task.dart';
import '../repositories/task_repository.dart';

@injectable
class GetTasks implements UseCase<List<Task>, NoParams> {
  final TaskRepository _repository;
  GetTasks(this._repository);

  @override
  Future<Either<Failure, List<Task>>> call(NoParams params) => _repository.getTasks();
}

// lib/features/task/domain/usecases/get_tasks_by_status.dart
@injectable
class GetTasksByStatus implements UseCase<List<Task>, TaskStatus> {
  final TaskRepository _repository;
  GetTasksByStatus(this._repository);

  @override
  Future<Either<Failure, List<Task>>> call(TaskStatus params) => _repository.getTasksByStatus(params);
}

// lib/features/task/domain/usecases/create_task.dart
@injectable
class CreateTask implements UseCase<Task, Task> {
  final TaskRepository _repository;
  CreateTask(this._repository);

  @override
  Future<Either<Failure, Task>> call(Task params) => _repository.createTask(params);
}

// lib/features/task/domain/usecases/update_task_status.dart
@freezed
sealed class UpdateTaskStatusParams with _$UpdateTaskStatusParams {
  const factory UpdateTaskStatusParams({
    required String id,
    required TaskStatus status,
  }) = _UpdateTaskStatusParams;
}

@injectable
class UpdateTaskStatus implements UseCase<Task, UpdateTaskStatusParams> {
  final TaskRepository _repository;
  UpdateTaskStatus(this._repository);

  @override
  Future<Either<Failure, Task>> call(UpdateTaskStatusParams params) {
    return _repository.updateTaskStatus(params.id, params.status);
  }
}

// lib/features/task/domain/usecases/complete_task.dart
@injectable
class CompleteTask implements UseCase<Task, String> {
  final TaskRepository _repository;
  CompleteTask(this._repository);

  @override
  Future<Either<Failure, Task>> call(String id) {
    return _repository.updateTaskStatus(id, TaskStatus.completed);
  }
}
```

## BLoC

```dart
// lib/features/task/presentation/bloc/task_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/task.dart';
import '../../domain/usecases/get_tasks.dart';
import '../../domain/usecases/get_tasks_by_status.dart';
import '../../domain/usecases/create_task.dart';
import '../../domain/usecases/update_task_status.dart';
import '../../domain/usecases/complete_task.dart';

part 'task_bloc.freezed.dart';

// Events
@freezed
sealed class TaskEvent with _$TaskEvent {
  const factory TaskEvent.loadTasks() = _LoadTasks;
  const factory TaskEvent.loadTasksByStatus(TaskStatus status) = _LoadTasksByStatus;
  const factory TaskEvent.createTask(Task task) = _CreateTask;
  const factory TaskEvent.completeTask(String id) = _CompleteTask;
  const factory TaskEvent.updateStatus(String id, TaskStatus status) = _UpdateStatus;
}

// States
@freezed
sealed class TaskState with _$TaskState {
  const factory TaskState.initial() = _Initial;
  const factory TaskState.loading() = _Loading;
  const factory TaskState.loaded({
    required List<Task> tasks,
    TaskStatus? filterStatus,
  }) = _Loaded;
  const factory TaskState.error(String message) = _Error;
}

// BLoC
@injectable
class TaskBloc extends Bloc<TaskEvent, TaskState> {
  final GetTasks _getTasks;
  final GetTasksByStatus _getTasksByStatus;
  final CreateTask _createTask;
  final CompleteTask _completeTask;
  final UpdateTaskStatus _updateTaskStatus;

  TaskBloc(
    this._getTasks,
    this._getTasksByStatus,
    this._createTask,
    this._completeTask,
    this._updateTaskStatus,
  ) : super(const TaskState.initial()) {
    on<TaskEvent>((event, emit) async {
      await event.map(
        loadTasks: (_) async {
          emit(const TaskState.loading());
          final result = await _getTasks(const NoParams());
          result.fold(
            (failure) => emit(TaskState.error(failure.message)),
            (tasks) => emit(TaskState.loaded(tasks: tasks)),
          );
        },
        loadTasksByStatus: (e) async {
          emit(const TaskState.loading());
          final result = await _getTasksByStatus(e.status);
          result.fold(
            (failure) => emit(TaskState.error(failure.message)),
            (tasks) => emit(TaskState.loaded(tasks: tasks, filterStatus: e.status)),
          );
        },
        createTask: (e) async {
          emit(const TaskState.loading());
          final result = await _createTask(e.task);
          await result.fold(
            (failure) async => emit(TaskState.error(failure.message)),
            (_) async => add(const TaskEvent.loadTasks()),
          );
        },
        completeTask: (e) async {
          final result = await _completeTask(e.id);
          await result.fold(
            (failure) async => emit(TaskState.error(failure.message)),
            (_) async => add(const TaskEvent.loadTasks()),
          );
        },
        updateStatus: (e) async {
          final result = await _updateTaskStatus(UpdateTaskStatusParams(
            id: e.id,
            status: e.status,
          ));
          await result.fold(
            (failure) async => emit(TaskState.error(failure.message)),
            (_) async => add(const TaskEvent.loadTasks()),
          );
        },
      );
    });
  }
}
```

## Riverpod Alternative

```dart
// lib/features/task/presentation/providers/task_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/task.dart';
import '../../domain/usecases/get_tasks.dart';
import '../../domain/usecases/create_task.dart';
import '../../domain/usecases/complete_task.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/usecases/usecase.dart';

part 'task_providers.g.dart';

@riverpod
class TaskFilter extends _$TaskFilter {
  @override
  TaskStatus? build() => null;

  void setFilter(TaskStatus? status) => state = status;
}

@riverpod
class TaskNotifier extends _$TaskNotifier {
  late final GetTasks _getTasks;
  late final CreateTask _createTask;
  late final CompleteTask _completeTask;

  @override
  Future<List<Task>> build() async {
    _getTasks = getIt<GetTasks>();
    _createTask = getIt<CreateTask>();
    _completeTask = getIt<CompleteTask>();

    return _loadTasks();
  }

  Future<List<Task>> _loadTasks() async {
    final result = await _getTasks(const NoParams());
    return result.fold(
      (failure) => throw Exception(failure.message),
      (tasks) => tasks,
    );
  }

  Future<void> create(Task task) async {
    state = const AsyncLoading();
    final result = await _createTask(task);
    result.fold(
      (failure) => state = AsyncError(failure.message, StackTrace.current),
      (_) async => state = AsyncData(await _loadTasks()),
    );
  }

  Future<void> complete(String id) async {
    final result = await _completeTask(id);
    result.fold(
      (failure) => state = AsyncError(failure.message, StackTrace.current),
      (_) async => state = AsyncData(await _loadTasks()),
    );
  }
}

@riverpod
List<Task> filteredTasks(FilteredTasksRef ref) {
  final tasksAsync = ref.watch(taskNotifierProvider);
  final filter = ref.watch(taskFilterProvider);

  return tasksAsync.when(
    data: (tasks) {
      if (filter == null) return tasks;
      return tasks.where((t) => t.status == filter).toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

@riverpod
Map<TaskStatus, int> taskCounts(TaskCountsRef ref) {
  final tasksAsync = ref.watch(taskNotifierProvider);

  return tasksAsync.when(
    data: (tasks) {
      return {
        for (final status in TaskStatus.values)
          status: tasks.where((t) => t.status == status).length,
      };
    },
    loading: () => {},
    error: (_, __) => {},
  );
}
```

## Pages

```dart
// lib/features/task/presentation/pages/task_list_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/task.dart';
import '../bloc/task_bloc.dart';
import '../widgets/task_card.dart';
import '../widgets/status_filter_chips.dart';

class TaskListPage extends StatelessWidget {
  const TaskListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
          ),
        ],
      ),
      body: Column(
        children: [
          const StatusFilterChips(),
          Expanded(
            child: BlocBuilder<TaskBloc, TaskState>(
              builder: (context, state) {
                return state.when(
                  initial: () => const Center(child: Text('Add your first task')),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  loaded: (tasks, filterStatus) => tasks.isEmpty
                      ? const Center(child: Text('No tasks'))
                      : ListView.builder(
                          itemCount: tasks.length,
                          itemBuilder: (context, index) => TaskCard(
                            task: tasks[index],
                            onComplete: () => context
                                .read<TaskBloc>()
                                .add(TaskEvent.completeTask(tasks[index].id)),
                            onStatusChange: (status) => context
                                .read<TaskBloc>()
                                .add(TaskEvent.updateStatus(tasks[index].id, status)),
                          ),
                        ),
                  error: (message) => Center(child: Text('Error: $message')),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateTaskDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => const StatusFilterSheet(),
    );
  }

  void _showCreateTaskDialog(BuildContext context) {
    // Implementation
  }
}

// lib/features/task/presentation/widgets/status_filter_chips.dart
class StatusFilterChips extends StatelessWidget {
  const StatusFilterChips({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(8),
      child: Row(
        children: [
          FilterChip(
            label: const Text('All'),
            selected: true,
            onSelected: (_) {},
          ),
          const SizedBox(width: 8),
          ...TaskStatus.values.map((status) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(status.name),
              selected: false,
              onSelected: (_) => context
                  .read<TaskBloc>()
                  .add(TaskEvent.loadTasksByStatus(status)),
            ),
          )),
        ],
      ),
    );
  }
}
```

## Widgets

```dart
// lib/features/task/presentation/widgets/task_card.dart
import 'package:flutter/material.dart';
import '../../domain/entities/task.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onComplete;
  final void Function(TaskStatus)? onStatusChange;

  const TaskCard({
    super.key,
    required this.task,
    this.onComplete,
    this.onStatusChange,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: _buildStatusIcon(),
        title: Text(
          task.title,
          style: TextStyle(
            decoration: task.isCompleted ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(task.description, maxLines: 1, overflow: TextOverflow.ellipsis),
            if (task.dueDate != null) ...[
              const SizedBox(height: 4),
              _buildDueDateChip(),
            ],
          ],
        ),
        trailing: _buildPriorityIndicator(),
        onTap: () => _showStatusMenu(context),
      ),
    );
  }

  Widget _buildStatusIcon() {
    return IconButton(
      icon: Icon(
        task.isCompleted ? Icons.check_circle : Icons.circle_outlined,
        color: task.isCompleted ? Colors.green : null,
      ),
      onPressed: task.isCompleted ? null : onComplete,
    );
  }

  Widget _buildDueDateChip() {
    final isOverdue = task.isOverdue;
    return Chip(
      label: Text(
        _formatDate(task.dueDate!),
        style: TextStyle(
          color: isOverdue ? Colors.white : null,
          fontSize: 12,
        ),
      ),
      backgroundColor: isOverdue ? Colors.red : null,
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _buildPriorityIndicator() {
    final color = switch (task.priority) {
      TaskPriority.high => Colors.red,
      TaskPriority.medium => Colors.orange,
      TaskPriority.low => Colors.green,
    };
    return Container(
      width: 4,
      height: 40,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  void _showStatusMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: TaskStatus.values.map((status) => ListTile(
          leading: Icon(_getStatusIcon(status)),
          title: Text(status.name),
          selected: task.status == status,
          onTap: () {
            Navigator.pop(context);
            onStatusChange?.call(status);
          },
        )).toList(),
      ),
    );
  }

  IconData _getStatusIcon(TaskStatus status) {
    return switch (status) {
      TaskStatus.pending => Icons.pending,
      TaskStatus.inProgress => Icons.play_arrow,
      TaskStatus.completed => Icons.check_circle,
      TaskStatus.cancelled => Icons.cancel,
    };
  }

  String _formatDate(DateTime date) => '${date.month}/${date.day}';
}
```
