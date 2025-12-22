# Tracked Pattern Template

시간/날짜 기반 트래킹 패턴. 예: Habit, Workout, Study

## Entities

```dart
// lib/features/habit/domain/entities/habit.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'habit.freezed.dart';
part 'habit.g.dart';

enum HabitFrequency {
  daily,
  weekly,
  monthly,
}

@freezed
sealed class Habit with _$Habit {
  const Habit._();

  const factory Habit({
    required String id,
    required String name,
    required String description,
    String? icon,
    String? color,
    @Default(HabitFrequency.daily) HabitFrequency frequency,
    @Default([]) List<int> targetDays, // 0=Sun, 1=Mon, ... 6=Sat (for weekly)
    int? targetCount, // For counted habits
    TimeOfDay? reminderTime,
    required DateTime createdAt,
  }) = _Habit;

  factory Habit.fromJson(Map<String, dynamic> json) => _$HabitFromJson(json);

  bool shouldCompleteOn(DateTime date) {
    return switch (frequency) {
      HabitFrequency.daily => true,
      HabitFrequency.weekly => targetDays.contains(date.weekday % 7),
      HabitFrequency.monthly => date.day == createdAt.day,
    };
  }
}

// lib/features/habit/domain/entities/habit_record.dart
@freezed
sealed class HabitRecord with _$HabitRecord {
  const factory HabitRecord({
    required String id,
    required String habitId,
    required DateTime date,
    @Default(1) int count, // For counted habits
    String? note,
    required DateTime createdAt,
  }) = _HabitRecord;

  factory HabitRecord.fromJson(Map<String, dynamic> json) => _$HabitRecordFromJson(json);
}

// lib/features/habit/domain/entities/habit_stats.dart
@freezed
sealed class HabitStats with _$HabitStats {
  const factory HabitStats({
    required String habitId,
    required int currentStreak,
    required int bestStreak,
    required int totalCompletions,
    required double completionRate,
    required List<DateTime> completedDates,
  }) = _HabitStats;
}

// lib/features/habit/domain/entities/habit_with_stats.dart
@freezed
sealed class HabitWithStats with _$HabitWithStats {
  const HabitWithStats._();

  const factory HabitWithStats({
    required Habit habit,
    required HabitStats stats,
    required bool isCompletedToday,
  }) = _HabitWithStats;

  double get progressToday => isCompletedToday ? 1.0 : 0.0;
}
```

## Drift Tables

```dart
// lib/core/database/tables/habits_table.dart
import 'package:drift/drift.dart';

class Habits extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get description => text()();
  TextColumn get icon => text().nullable()();
  TextColumn get color => text().nullable()();
  IntColumn get frequency => integer().withDefault(const Constant(0))();
  TextColumn get targetDays => text().withDefault(const Constant('[]'))(); // JSON array
  IntColumn get targetCount => integer().nullable()();
  IntColumn get reminderHour => integer().nullable()();
  IntColumn get reminderMinute => integer().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class HabitRecords extends Table {
  TextColumn get id => text()();
  TextColumn get habitId => text().references(Habits, #id)();
  DateTimeColumn get date => dateTime()();
  IntColumn get count => integer().withDefault(const Constant(1))();
  TextColumn get note => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Repository Interface

```dart
// lib/features/habit/domain/repositories/habit_repository.dart
import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/habit.dart';
import '../entities/habit_record.dart';
import '../entities/habit_stats.dart';
import '../entities/habit_with_stats.dart';

abstract class HabitRepository {
  // Habit CRUD
  Future<Either<Failure, List<Habit>>> getHabits();
  Future<Either<Failure, Habit>> getHabitById(String id);
  Future<Either<Failure, Habit>> createHabit(Habit habit);
  Future<Either<Failure, Habit>> updateHabit(Habit habit);
  Future<Either<Failure, Unit>> deleteHabit(String id);

  // Records
  Future<Either<Failure, HabitRecord>> completeHabit(String habitId, {DateTime? date, String? note});
  Future<Either<Failure, Unit>> uncompleteHabit(String habitId, DateTime date);
  Future<Either<Failure, List<HabitRecord>>> getRecordsByHabit(String habitId);
  Future<Either<Failure, List<HabitRecord>>> getRecordsByDate(DateTime date);
  Future<Either<Failure, List<HabitRecord>>> getRecordsByDateRange(DateTime start, DateTime end);

  // Stats
  Future<Either<Failure, HabitStats>> getHabitStats(String habitId);
  Future<Either<Failure, List<HabitWithStats>>> getHabitsWithStats();
  Future<Either<Failure, bool>> isCompletedToday(String habitId);

  // Streaks
  Future<Either<Failure, int>> calculateCurrentStreak(String habitId);
  Future<Either<Failure, int>> calculateBestStreak(String habitId);
}
```

## Local DataSource

```dart
// lib/features/habit/data/datasources/habit_local_datasource.dart
import 'dart:convert';
import 'package:injectable/injectable.dart';
import '../../../../core/database/app_database.dart';
import '../models/habit_model.dart';
import '../models/habit_record_model.dart';

abstract class HabitLocalDataSource {
  Future<List<HabitModel>> getHabits();
  Future<HabitModel?> getHabitById(String id);
  Future<HabitModel> createHabit(HabitModel habit);
  Future<HabitModel> updateHabit(HabitModel habit);
  Future<void> deleteHabit(String id);

  Future<HabitRecordModel> createRecord(HabitRecordModel record);
  Future<void> deleteRecord(String habitId, DateTime date);
  Future<List<HabitRecordModel>> getRecordsByHabit(String habitId);
  Future<List<HabitRecordModel>> getRecordsByDate(DateTime date);
  Future<List<HabitRecordModel>> getRecordsByDateRange(DateTime start, DateTime end);
  Future<bool> hasRecordForDate(String habitId, DateTime date);
}

@Injectable(as: HabitLocalDataSource)
class HabitLocalDataSourceImpl implements HabitLocalDataSource {
  final AppDatabase _db;

  HabitLocalDataSourceImpl(this._db);

  @override
  Future<List<HabitModel>> getHabits() async {
    final results = await (_db.select(_db.habits)
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
      .get();
    return results.map((row) => HabitModel(
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      frequency: row.frequency,
      targetDays: (jsonDecode(row.targetDays) as List).cast<int>(),
      targetCount: row.targetCount,
      reminderHour: row.reminderHour,
      reminderMinute: row.reminderMinute,
      createdAt: row.createdAt,
    )).toList();
  }

  @override
  Future<HabitModel?> getHabitById(String id) async {
    final result = await (_db.select(_db.habits)
      ..where((t) => t.id.equals(id)))
      .getSingleOrNull();
    if (result == null) return null;
    return HabitModel(
      id: result.id,
      name: result.name,
      description: result.description,
      icon: result.icon,
      color: result.color,
      frequency: result.frequency,
      targetDays: (jsonDecode(result.targetDays) as List).cast<int>(),
      targetCount: result.targetCount,
      reminderHour: result.reminderHour,
      reminderMinute: result.reminderMinute,
      createdAt: result.createdAt,
    );
  }

  @override
  Future<HabitModel> createHabit(HabitModel habit) async {
    await _db.into(_db.habits).insert(HabitsCompanion.insert(
      id: habit.id,
      name: habit.name,
      description: habit.description,
      icon: Value(habit.icon),
      color: Value(habit.color),
      frequency: Value(habit.frequency),
      targetDays: Value(jsonEncode(habit.targetDays)),
      targetCount: Value(habit.targetCount),
      reminderHour: Value(habit.reminderHour),
      reminderMinute: Value(habit.reminderMinute),
      createdAt: habit.createdAt,
    ));
    return habit;
  }

  @override
  Future<HabitRecordModel> createRecord(HabitRecordModel record) async {
    await _db.into(_db.habitRecords).insert(HabitRecordsCompanion.insert(
      id: record.id,
      habitId: record.habitId,
      date: record.date,
      count: Value(record.count),
      note: Value(record.note),
      createdAt: record.createdAt,
    ));
    return record;
  }

  @override
  Future<void> deleteRecord(String habitId, DateTime date) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    await (_db.delete(_db.habitRecords)
      ..where((t) => t.habitId.equals(habitId) & t.date.isBetweenValues(startOfDay, endOfDay)))
      .go();
  }

  @override
  Future<List<HabitRecordModel>> getRecordsByHabit(String habitId) async {
    final results = await (_db.select(_db.habitRecords)
      ..where((t) => t.habitId.equals(habitId))
      ..orderBy([(t) => OrderingTerm.desc(t.date)]))
      .get();
    return results.map(_recordRowToModel).toList();
  }

  @override
  Future<List<HabitRecordModel>> getRecordsByDate(DateTime date) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    final results = await (_db.select(_db.habitRecords)
      ..where((t) => t.date.isBetweenValues(startOfDay, endOfDay)))
      .get();
    return results.map(_recordRowToModel).toList();
  }

  @override
  Future<List<HabitRecordModel>> getRecordsByDateRange(DateTime start, DateTime end) async {
    final results = await (_db.select(_db.habitRecords)
      ..where((t) => t.date.isBetweenValues(start, end))
      ..orderBy([(t) => OrderingTerm.desc(t.date)]))
      .get();
    return results.map(_recordRowToModel).toList();
  }

  @override
  Future<bool> hasRecordForDate(String habitId, DateTime date) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    final result = await (_db.select(_db.habitRecords)
      ..where((t) => t.habitId.equals(habitId) & t.date.isBetweenValues(startOfDay, endOfDay)))
      .getSingleOrNull();
    return result != null;
  }

  // ... other methods

  HabitRecordModel _recordRowToModel(dynamic row) => HabitRecordModel(
    id: row.id,
    habitId: row.habitId,
    date: row.date,
    count: row.count,
    note: row.note,
    createdAt: row.createdAt,
  );
}
```

## Streak Calculation Service

```dart
// lib/features/habit/domain/services/streak_calculator.dart
import '../entities/habit.dart';
import '../entities/habit_record.dart';

class StreakCalculator {
  static int calculateCurrentStreak(Habit habit, List<HabitRecord> records) {
    if (records.isEmpty) return 0;

    final sortedRecords = records.toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final completedDates = sortedRecords
        .map((r) => DateTime(r.date.year, r.date.month, r.date.day))
        .toSet();

    int streak = 0;
    var checkDate = DateTime.now();
    checkDate = DateTime(checkDate.year, checkDate.month, checkDate.day);

    // Check if today should be completed
    if (habit.shouldCompleteOn(checkDate)) {
      if (!completedDates.contains(checkDate)) {
        // Today not completed, check yesterday
        checkDate = checkDate.subtract(const Duration(days: 1));
      }
    }

    while (true) {
      if (habit.shouldCompleteOn(checkDate)) {
        if (completedDates.contains(checkDate)) {
          streak++;
        } else {
          break;
        }
      }
      checkDate = checkDate.subtract(const Duration(days: 1));

      // Don't go before habit creation
      if (checkDate.isBefore(habit.createdAt)) break;
    }

    return streak;
  }

  static int calculateBestStreak(Habit habit, List<HabitRecord> records) {
    if (records.isEmpty) return 0;

    final sortedRecords = records.toList()
      ..sort((a, b) => a.date.compareTo(b.date));

    final completedDates = sortedRecords
        .map((r) => DateTime(r.date.year, r.date.month, r.date.day))
        .toSet();

    int bestStreak = 0;
    int currentStreak = 0;
    DateTime? lastDate;

    for (final record in sortedRecords) {
      final date = DateTime(record.date.year, record.date.month, record.date.day);

      if (lastDate == null) {
        currentStreak = 1;
      } else {
        // Check for consecutive days (considering habit frequency)
        var expectedDate = lastDate.add(const Duration(days: 1));
        while (!habit.shouldCompleteOn(expectedDate) && expectedDate.isBefore(date)) {
          expectedDate = expectedDate.add(const Duration(days: 1));
        }

        if (date == expectedDate) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
      lastDate = date;
    }

    return bestStreak;
  }

  static double calculateCompletionRate(Habit habit, List<HabitRecord> records, int days) {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: days));

    int expectedCount = 0;
    int actualCount = 0;

    final completedDates = records
        .map((r) => DateTime(r.date.year, r.date.month, r.date.day))
        .toSet();

    for (var date = startDate; date.isBefore(now); date = date.add(const Duration(days: 1))) {
      if (habit.shouldCompleteOn(date)) {
        expectedCount++;
        if (completedDates.contains(DateTime(date.year, date.month, date.day))) {
          actualCount++;
        }
      }
    }

    return expectedCount > 0 ? actualCount / expectedCount : 0.0;
  }
}
```

## Riverpod Providers

```dart
// lib/features/habit/presentation/providers/habit_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/habit.dart';
import '../../domain/entities/habit_with_stats.dart';

part 'habit_providers.g.dart';

@riverpod
class SelectedDate extends _$SelectedDate {
  @override
  DateTime build() => DateTime.now();

  void select(DateTime date) => state = date;
  void today() => state = DateTime.now();
  void previousDay() => state = state.subtract(const Duration(days: 1));
  void nextDay() => state = state.add(const Duration(days: 1));
}

@riverpod
Future<List<HabitWithStats>> habitsWithStats(HabitsWithStatsRef ref) async {
  final getHabitsWithStats = getIt<GetHabitsWithStats>();
  final result = await getHabitsWithStats(const NoParams());
  return result.fold((f) => throw Exception(f.message), (h) => h);
}

@riverpod
class HabitActions extends _$HabitActions {
  @override
  FutureOr<void> build() {}

  Future<void> complete(String habitId, {String? note}) async {
    state = const AsyncLoading();
    final completeHabit = getIt<CompleteHabit>();
    final result = await completeHabit(CompleteHabitParams(habitId: habitId, note: note));
    result.fold(
      (f) => state = AsyncError(f.message, StackTrace.current),
      (_) {
        ref.invalidate(habitsWithStatsProvider);
        state = const AsyncData(null);
      },
    );
  }

  Future<void> uncomplete(String habitId, DateTime date) async {
    state = const AsyncLoading();
    final uncompleteHabit = getIt<UncompleteHabit>();
    final result = await uncompleteHabit(UncompleteHabitParams(habitId: habitId, date: date));
    result.fold(
      (f) => state = AsyncError(f.message, StackTrace.current),
      (_) {
        ref.invalidate(habitsWithStatsProvider);
        state = const AsyncData(null);
      },
    );
  }
}

@riverpod
List<HabitWithStats> todaysHabits(TodaysHabitsRef ref) {
  final habitsAsync = ref.watch(habitsWithStatsProvider);
  final selectedDate = ref.watch(selectedDateProvider);

  return habitsAsync.when(
    data: (habits) => habits.where((h) => h.habit.shouldCompleteOn(selectedDate)).toList(),
    loading: () => [],
    error: (_, __) => [],
  );
}

@riverpod
({int completed, int total}) todayProgress(TodayProgressRef ref) {
  final habits = ref.watch(todaysHabitsProvider);
  final completed = habits.where((h) => h.isCompletedToday).length;
  return (completed: completed, total: habits.length);
}
```

## Widgets

```dart
// lib/features/habit/presentation/widgets/habit_card.dart
import 'package:flutter/material.dart';
import '../../domain/entities/habit_with_stats.dart';

class HabitCard extends StatelessWidget {
  final HabitWithStats habitWithStats;
  final VoidCallback? onComplete;
  final VoidCallback? onTap;

  const HabitCard({
    super.key,
    required this.habitWithStats,
    this.onComplete,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final habit = habitWithStats.habit;
    final stats = habitWithStats.stats;
    final isCompleted = habitWithStats.isCompletedToday;

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildCheckButton(context, isCompleted),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      habit.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        decoration: isCompleted ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    _buildStreakInfo(context, stats),
                  ],
                ),
              ),
              _buildProgressRing(stats.completionRate),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCheckButton(BuildContext context, bool isCompleted) {
    return GestureDetector(
      onTap: isCompleted ? null : onComplete,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isCompleted ? Colors.green : Colors.transparent,
          border: Border.all(
            color: isCompleted ? Colors.green : Colors.grey,
            width: 2,
          ),
        ),
        child: isCompleted
            ? const Icon(Icons.check, color: Colors.white, size: 20)
            : null,
      ),
    );
  }

  Widget _buildStreakInfo(BuildContext context, HabitStats stats) {
    return Row(
      children: [
        const Icon(Icons.local_fire_department, size: 16, color: Colors.orange),
        const SizedBox(width: 4),
        Text(
          '${stats.currentStreak} day streak',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (stats.currentStreak == stats.bestStreak && stats.bestStreak > 0) ...[
          const SizedBox(width: 8),
          const Icon(Icons.emoji_events, size: 16, color: Colors.amber),
        ],
      ],
    );
  }

  Widget _buildProgressRing(double rate) {
    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: rate,
            strokeWidth: 4,
            backgroundColor: Colors.grey.shade200,
          ),
          Text(
            '${(rate * 100).toInt()}%',
            style: const TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }
}

// lib/features/habit/presentation/widgets/streak_calendar.dart
class StreakCalendar extends StatelessWidget {
  final List<DateTime> completedDates;
  final int months;

  const StreakCalendar({
    super.key,
    required this.completedDates,
    this.months = 3,
  });

  @override
  Widget build(BuildContext context) {
    final completedSet = completedDates
        .map((d) => DateTime(d.year, d.month, d.day))
        .toSet();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        childAspectRatio: 1,
        mainAxisSpacing: 2,
        crossAxisSpacing: 2,
      ),
      itemCount: months * 30,
      itemBuilder: (context, index) {
        final date = DateTime.now().subtract(Duration(days: months * 30 - index - 1));
        final isCompleted = completedSet.contains(DateTime(date.year, date.month, date.day));

        return Container(
          decoration: BoxDecoration(
            color: isCompleted ? Colors.green : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(2),
          ),
        );
      },
    );
  }
}
```
