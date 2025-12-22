# Simple Pattern Template

단일 엔티티 CRUD 패턴. 예: Note, Memo, Bookmark

## Entity

```dart
// lib/features/note/domain/entities/note.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'note.freezed.dart';
part 'note.g.dart';

@freezed
class Note with _$Note {
  const factory Note({
    required String id,
    required String title,
    required String content,
    required DateTime createdAt,
    DateTime? updatedAt,
  }) = _Note;

  factory Note.fromJson(Map<String, dynamic> json) => _$NoteFromJson(json);
}
```

## Drift Table

```dart
// lib/core/database/tables/notes_table.dart
import 'package:drift/drift.dart';

class Notes extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get content => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Model (Data Layer)

```dart
// lib/features/note/data/models/note_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/note.dart';

part 'note_model.freezed.dart';
part 'note_model.g.dart';

@freezed
class NoteModel with _$NoteModel {
  const NoteModel._();

  const factory NoteModel({
    required String id,
    required String title,
    required String content,
    required DateTime createdAt,
    DateTime? updatedAt,
  }) = _NoteModel;

  factory NoteModel.fromJson(Map<String, dynamic> json) => _$NoteModelFromJson(json);

  factory NoteModel.fromEntity(Note entity) => NoteModel(
    id: entity.id,
    title: entity.title,
    content: entity.content,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  );

  Note toEntity() => Note(
    id: id,
    title: title,
    content: content,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );
}
```

## Repository Interface

```dart
// lib/features/note/domain/repositories/note_repository.dart
import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/note.dart';

abstract class NoteRepository {
  Future<Either<Failure, List<Note>>> getNotes();
  Future<Either<Failure, Note>> getNoteById(String id);
  Future<Either<Failure, Note>> createNote(Note note);
  Future<Either<Failure, Note>> updateNote(Note note);
  Future<Either<Failure, Unit>> deleteNote(String id);
}
```

## Local DataSource

```dart
// lib/features/note/data/datasources/note_local_datasource.dart
import 'package:injectable/injectable.dart';
import '../../../../core/database/app_database.dart';
import '../models/note_model.dart';

abstract class NoteLocalDataSource {
  Future<List<NoteModel>> getNotes();
  Future<NoteModel?> getNoteById(String id);
  Future<NoteModel> createNote(NoteModel note);
  Future<NoteModel> updateNote(NoteModel note);
  Future<void> deleteNote(String id);
}

@Injectable(as: NoteLocalDataSource)
class NoteLocalDataSourceImpl implements NoteLocalDataSource {
  final AppDatabase _db;

  NoteLocalDataSourceImpl(this._db);

  @override
  Future<List<NoteModel>> getNotes() async {
    final results = await _db.select(_db.notes).get();
    return results.map((row) => NoteModel(
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    )).toList();
  }

  @override
  Future<NoteModel?> getNoteById(String id) async {
    final result = await (_db.select(_db.notes)
      ..where((t) => t.id.equals(id)))
      .getSingleOrNull();
    if (result == null) return null;
    return NoteModel(
      id: result.id,
      title: result.title,
      content: result.content,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    );
  }

  @override
  Future<NoteModel> createNote(NoteModel note) async {
    await _db.into(_db.notes).insert(NotesCompanion.insert(
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: Value(note.updatedAt),
    ));
    return note;
  }

  @override
  Future<NoteModel> updateNote(NoteModel note) async {
    await (_db.update(_db.notes)..where((t) => t.id.equals(note.id)))
      .write(NotesCompanion(
        title: Value(note.title),
        content: Value(note.content),
        updatedAt: Value(DateTime.now()),
      ));
    return note;
  }

  @override
  Future<void> deleteNote(String id) async {
    await (_db.delete(_db.notes)..where((t) => t.id.equals(id))).go();
  }
}
```

## Repository Implementation

```dart
// lib/features/note/data/repositories/note_repository_impl.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/note.dart';
import '../../domain/repositories/note_repository.dart';
import '../datasources/note_local_datasource.dart';
import '../models/note_model.dart';

@Injectable(as: NoteRepository)
class NoteRepositoryImpl implements NoteRepository {
  final NoteLocalDataSource _localDataSource;

  NoteRepositoryImpl(this._localDataSource);

  @override
  Future<Either<Failure, List<Note>>> getNotes() async {
    try {
      final models = await _localDataSource.getNotes();
      return Right(models.map((m) => m.toEntity()).toList());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Note>> getNoteById(String id) async {
    try {
      final model = await _localDataSource.getNoteById(id);
      if (model == null) {
        return const Left(Failure.cache(message: 'Note not found'));
      }
      return Right(model.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Note>> createNote(Note note) async {
    try {
      final model = NoteModel.fromEntity(note);
      final created = await _localDataSource.createNote(model);
      return Right(created.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Note>> updateNote(Note note) async {
    try {
      final model = NoteModel.fromEntity(note);
      final updated = await _localDataSource.updateNote(model);
      return Right(updated.toEntity());
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteNote(String id) async {
    try {
      await _localDataSource.deleteNote(id);
      return const Right(unit);
    } catch (e) {
      return Left(Failure.cache(message: e.toString()));
    }
  }
}
```

## UseCases

```dart
// lib/features/note/domain/usecases/get_notes.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/note.dart';
import '../repositories/note_repository.dart';

@injectable
class GetNotes implements UseCase<List<Note>, NoParams> {
  final NoteRepository _repository;

  GetNotes(this._repository);

  @override
  Future<Either<Failure, List<Note>>> call(NoParams params) {
    return _repository.getNotes();
  }
}

// lib/features/note/domain/usecases/create_note.dart
@injectable
class CreateNote implements UseCase<Note, Note> {
  final NoteRepository _repository;

  CreateNote(this._repository);

  @override
  Future<Either<Failure, Note>> call(Note params) {
    return _repository.createNote(params);
  }
}

// lib/features/note/domain/usecases/update_note.dart
@injectable
class UpdateNote implements UseCase<Note, Note> {
  final NoteRepository _repository;

  UpdateNote(this._repository);

  @override
  Future<Either<Failure, Note>> call(Note params) {
    return _repository.updateNote(params);
  }
}

// lib/features/note/domain/usecases/delete_note.dart
@injectable
class DeleteNote implements UseCase<Unit, String> {
  final NoteRepository _repository;

  DeleteNote(this._repository);

  @override
  Future<Either<Failure, Unit>> call(String params) {
    return _repository.deleteNote(params);
  }
}
```

## BLoC

```dart
// lib/features/note/presentation/bloc/note_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/note.dart';
import '../../domain/usecases/get_notes.dart';
import '../../domain/usecases/create_note.dart';
import '../../domain/usecases/update_note.dart';
import '../../domain/usecases/delete_note.dart';

part 'note_bloc.freezed.dart';

// Events
@freezed
sealed class NoteEvent with _$NoteEvent {
  const factory NoteEvent.loadNotes() = _LoadNotes;
  const factory NoteEvent.createNote(Note note) = _CreateNote;
  const factory NoteEvent.updateNote(Note note) = _UpdateNote;
  const factory NoteEvent.deleteNote(String id) = _DeleteNote;
}

// States
@freezed
sealed class NoteState with _$NoteState {
  const factory NoteState.initial() = _Initial;
  const factory NoteState.loading() = _Loading;
  const factory NoteState.loaded(List<Note> notes) = _Loaded;
  const factory NoteState.error(String message) = _Error;
}

// BLoC
@injectable
class NoteBloc extends Bloc<NoteEvent, NoteState> {
  final GetNotes _getNotes;
  final CreateNote _createNote;
  final UpdateNote _updateNote;
  final DeleteNote _deleteNote;

  NoteBloc(
    this._getNotes,
    this._createNote,
    this._updateNote,
    this._deleteNote,
  ) : super(const NoteState.initial()) {
    on<NoteEvent>((event, emit) async {
      await event.map(
        loadNotes: (_) async {
          emit(const NoteState.loading());
          final result = await _getNotes(const NoParams());
          result.fold(
            (failure) => emit(NoteState.error(failure.message)),
            (notes) => emit(NoteState.loaded(notes)),
          );
        },
        createNote: (e) async {
          emit(const NoteState.loading());
          final result = await _createNote(e.note);
          await result.fold(
            (failure) async => emit(NoteState.error(failure.message)),
            (_) async {
              final notesResult = await _getNotes(const NoParams());
              notesResult.fold(
                (failure) => emit(NoteState.error(failure.message)),
                (notes) => emit(NoteState.loaded(notes)),
              );
            },
          );
        },
        updateNote: (e) async {
          emit(const NoteState.loading());
          final result = await _updateNote(e.note);
          await result.fold(
            (failure) async => emit(NoteState.error(failure.message)),
            (_) async {
              final notesResult = await _getNotes(const NoParams());
              notesResult.fold(
                (failure) => emit(NoteState.error(failure.message)),
                (notes) => emit(NoteState.loaded(notes)),
              );
            },
          );
        },
        deleteNote: (e) async {
          emit(const NoteState.loading());
          final result = await _deleteNote(e.id);
          await result.fold(
            (failure) async => emit(NoteState.error(failure.message)),
            (_) async {
              final notesResult = await _getNotes(const NoParams());
              notesResult.fold(
                (failure) => emit(NoteState.error(failure.message)),
                (notes) => emit(NoteState.loaded(notes)),
              );
            },
          );
        },
      );
    });
  }
}
```

## Riverpod Alternative

```dart
// lib/features/note/presentation/providers/note_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/note.dart';
import '../../domain/usecases/get_notes.dart';
import '../../domain/usecases/create_note.dart';
import '../../domain/usecases/update_note.dart';
import '../../domain/usecases/delete_note.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/usecases/usecase.dart';

part 'note_providers.g.dart';

@riverpod
class NoteNotifier extends _$NoteNotifier {
  late final GetNotes _getNotes;
  late final CreateNote _createNote;
  late final UpdateNote _updateNote;
  late final DeleteNote _deleteNote;

  @override
  Future<List<Note>> build() async {
    _getNotes = getIt<GetNotes>();
    _createNote = getIt<CreateNote>();
    _updateNote = getIt<UpdateNote>();
    _deleteNote = getIt<DeleteNote>();

    return _loadNotes();
  }

  Future<List<Note>> _loadNotes() async {
    final result = await _getNotes(const NoParams());
    return result.fold(
      (failure) => throw Exception(failure.message),
      (notes) => notes,
    );
  }

  Future<void> create(Note note) async {
    state = const AsyncLoading();
    final result = await _createNote(note);
    result.fold(
      (failure) => state = AsyncError(failure.message, StackTrace.current),
      (_) async => state = AsyncData(await _loadNotes()),
    );
  }

  Future<void> update(Note note) async {
    state = const AsyncLoading();
    final result = await _updateNote(note);
    result.fold(
      (failure) => state = AsyncError(failure.message, StackTrace.current),
      (_) async => state = AsyncData(await _loadNotes()),
    );
  }

  Future<void> delete(String id) async {
    state = const AsyncLoading();
    final result = await _deleteNote(id);
    result.fold(
      (failure) => state = AsyncError(failure.message, StackTrace.current),
      (_) async => state = AsyncData(await _loadNotes()),
    );
  }
}
```

## Pages

```dart
// lib/features/note/presentation/pages/note_list_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/note_bloc.dart';
import '../widgets/note_card.dart';
import 'note_detail_page.dart';

class NoteListPage extends StatelessWidget {
  const NoteListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes'),
      ),
      body: BlocBuilder<NoteBloc, NoteState>(
        builder: (context, state) {
          return state.when(
            initial: () => const Center(child: Text('Press + to add a note')),
            loading: () => const Center(child: CircularProgressIndicator()),
            loaded: (notes) => notes.isEmpty
                ? const Center(child: Text('No notes yet'))
                : ListView.builder(
                    itemCount: notes.length,
                    itemBuilder: (context, index) => NoteCard(
                      note: notes[index],
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => NoteDetailPage(note: notes[index]),
                        ),
                      ),
                    ),
                  ),
            error: (message) => Center(child: Text('Error: $message')),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const NoteDetailPage()),
        ),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

## Widgets

```dart
// lib/features/note/presentation/widgets/note_card.dart
import 'package:flutter/material.dart';
import '../../domain/entities/note.dart';

class NoteCard extends StatelessWidget {
  final Note note;
  final VoidCallback? onTap;

  const NoteCard({
    super.key,
    required this.note,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        title: Text(
          note.title,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(
          note.content,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Text(
          _formatDate(note.createdAt),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        onTap: onTap,
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}';
  }
}
```
