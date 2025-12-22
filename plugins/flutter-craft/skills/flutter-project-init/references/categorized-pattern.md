# Categorized Pattern Template

카테고리 관계가 있는 엔티티 CRUD 패턴. 예: Expense, Product, Recipe

## Entities

```dart
// lib/features/expense/domain/entities/expense.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'expense.freezed.dart';
part 'expense.g.dart';

@freezed
sealed class Expense with _$Expense {
  const factory Expense({
    required String id,
    required String title,
    required double amount,
    required String categoryId,
    required DateTime date,
    String? note,
    String? receiptUrl,
    required DateTime createdAt,
  }) = _Expense;

  factory Expense.fromJson(Map<String, dynamic> json) => _$ExpenseFromJson(json);
}

// lib/features/expense/domain/entities/category.dart
@freezed
sealed class Category with _$Category {
  const Category._();

  const factory Category({
    required String id,
    required String name,
    required String icon,
    required String color,
    double? budget,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) => _$CategoryFromJson(json);

  // Predefined categories
  static List<Category> get defaults => [
    const Category(id: 'food', name: 'Food', icon: 'restaurant', color: '#FF5722'),
    const Category(id: 'transport', name: 'Transport', icon: 'directions_car', color: '#2196F3'),
    const Category(id: 'shopping', name: 'Shopping', icon: 'shopping_bag', color: '#9C27B0'),
    const Category(id: 'entertainment', name: 'Entertainment', icon: 'movie', color: '#E91E63'),
    const Category(id: 'bills', name: 'Bills', icon: 'receipt', color: '#607D8B'),
    const Category(id: 'health', name: 'Health', icon: 'medical_services', color: '#4CAF50'),
    const Category(id: 'other', name: 'Other', icon: 'more_horiz', color: '#795548'),
  ];
}

// lib/features/expense/domain/entities/expense_with_category.dart
@freezed
sealed class ExpenseWithCategory with _$ExpenseWithCategory {
  const factory ExpenseWithCategory({
    required Expense expense,
    required Category category,
  }) = _ExpenseWithCategory;
}
```

## Drift Tables

```dart
// lib/core/database/tables/expenses_table.dart
import 'package:drift/drift.dart';

class Expenses extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  RealColumn get amount => real()();
  TextColumn get categoryId => text().references(Categories, #id)();
  DateTimeColumn get date => dateTime()();
  TextColumn get note => text().nullable()();
  TextColumn get receiptUrl => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Categories extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get icon => text()();
  TextColumn get color => text()();
  RealColumn get budget => real().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Models (Data Layer)

```dart
// lib/features/expense/data/models/expense_model.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/expense.dart';

part 'expense_model.freezed.dart';
part 'expense_model.g.dart';

@freezed
sealed class ExpenseModel with _$ExpenseModel {
  const ExpenseModel._();

  const factory ExpenseModel({
    required String id,
    required String title,
    required double amount,
    required String categoryId,
    required DateTime date,
    String? note,
    String? receiptUrl,
    required DateTime createdAt,
  }) = _ExpenseModel;

  factory ExpenseModel.fromJson(Map<String, dynamic> json) => _$ExpenseModelFromJson(json);

  factory ExpenseModel.fromEntity(Expense entity) => ExpenseModel(
    id: entity.id,
    title: entity.title,
    amount: entity.amount,
    categoryId: entity.categoryId,
    date: entity.date,
    note: entity.note,
    receiptUrl: entity.receiptUrl,
    createdAt: entity.createdAt,
  );

  Expense toEntity() => Expense(
    id: id,
    title: title,
    amount: amount,
    categoryId: categoryId,
    date: date,
    note: note,
    receiptUrl: receiptUrl,
    createdAt: createdAt,
  );
}

// lib/features/expense/data/models/category_model.dart
@freezed
sealed class CategoryModel with _$CategoryModel {
  const CategoryModel._();

  const factory CategoryModel({
    required String id,
    required String name,
    required String icon,
    required String color,
    double? budget,
  }) = _CategoryModel;

  factory CategoryModel.fromJson(Map<String, dynamic> json) => _$CategoryModelFromJson(json);

  factory CategoryModel.fromEntity(Category entity) => CategoryModel(
    id: entity.id,
    name: entity.name,
    icon: entity.icon,
    color: entity.color,
    budget: entity.budget,
  );

  Category toEntity() => Category(
    id: id,
    name: name,
    icon: icon,
    color: color,
    budget: budget,
  );
}
```

## Repository Interfaces

```dart
// lib/features/expense/domain/repositories/expense_repository.dart
import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/expense.dart';
import '../entities/expense_with_category.dart';

abstract class ExpenseRepository {
  Future<Either<Failure, List<Expense>>> getExpenses();
  Future<Either<Failure, List<ExpenseWithCategory>>> getExpensesWithCategory();
  Future<Either<Failure, List<Expense>>> getExpensesByCategory(String categoryId);
  Future<Either<Failure, List<Expense>>> getExpensesByDateRange(DateTime start, DateTime end);
  Future<Either<Failure, Expense>> createExpense(Expense expense);
  Future<Either<Failure, Expense>> updateExpense(Expense expense);
  Future<Either<Failure, Unit>> deleteExpense(String id);
  Future<Either<Failure, double>> getTotalByCategory(String categoryId);
  Future<Either<Failure, double>> getTotalByDateRange(DateTime start, DateTime end);
  Future<Either<Failure, Map<String, double>>> getTotalsByCategory();
}

// lib/features/expense/domain/repositories/category_repository.dart
abstract class CategoryRepository {
  Future<Either<Failure, List<Category>>> getCategories();
  Future<Either<Failure, Category>> getCategoryById(String id);
  Future<Either<Failure, Category>> createCategory(Category category);
  Future<Either<Failure, Category>> updateCategory(Category category);
  Future<Either<Failure, Unit>> deleteCategory(String id);
  Future<Either<Failure, Unit>> initializeDefaultCategories();
}
```

## Local DataSource

```dart
// lib/features/expense/data/datasources/expense_local_datasource.dart
import 'package:injectable/injectable.dart';
import '../../../../core/database/app_database.dart';
import '../models/expense_model.dart';
import '../models/category_model.dart';

abstract class ExpenseLocalDataSource {
  Future<List<ExpenseModel>> getExpenses();
  Future<List<(ExpenseModel, CategoryModel)>> getExpensesWithCategory();
  Future<List<ExpenseModel>> getExpensesByCategory(String categoryId);
  Future<List<ExpenseModel>> getExpensesByDateRange(DateTime start, DateTime end);
  Future<ExpenseModel> createExpense(ExpenseModel expense);
  Future<ExpenseModel> updateExpense(ExpenseModel expense);
  Future<void> deleteExpense(String id);
  Future<double> getTotalByCategory(String categoryId);
  Future<double> getTotalByDateRange(DateTime start, DateTime end);
  Future<Map<String, double>> getTotalsByCategory();
}

@Injectable(as: ExpenseLocalDataSource)
class ExpenseLocalDataSourceImpl implements ExpenseLocalDataSource {
  final AppDatabase _db;

  ExpenseLocalDataSourceImpl(this._db);

  @override
  Future<List<ExpenseModel>> getExpenses() async {
    final results = await (_db.select(_db.expenses)
      ..orderBy([(t) => OrderingTerm.desc(t.date)]))
      .get();
    return results.map(_rowToModel).toList();
  }

  @override
  Future<List<(ExpenseModel, CategoryModel)>> getExpensesWithCategory() async {
    final query = _db.select(_db.expenses).join([
      innerJoin(_db.categories, _db.categories.id.equalsExp(_db.expenses.categoryId)),
    ]);
    query.orderBy([OrderingTerm.desc(_db.expenses.date)]);

    final results = await query.get();
    return results.map((row) {
      final expense = row.readTable(_db.expenses);
      final category = row.readTable(_db.categories);
      return (
        ExpenseModel(
          id: expense.id,
          title: expense.title,
          amount: expense.amount,
          categoryId: expense.categoryId,
          date: expense.date,
          note: expense.note,
          receiptUrl: expense.receiptUrl,
          createdAt: expense.createdAt,
        ),
        CategoryModel(
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          budget: category.budget,
        ),
      );
    }).toList();
  }

  @override
  Future<List<ExpenseModel>> getExpensesByCategory(String categoryId) async {
    final results = await (_db.select(_db.expenses)
      ..where((t) => t.categoryId.equals(categoryId))
      ..orderBy([(t) => OrderingTerm.desc(t.date)]))
      .get();
    return results.map(_rowToModel).toList();
  }

  @override
  Future<List<ExpenseModel>> getExpensesByDateRange(DateTime start, DateTime end) async {
    final results = await (_db.select(_db.expenses)
      ..where((t) => t.date.isBetweenValues(start, end))
      ..orderBy([(t) => OrderingTerm.desc(t.date)]))
      .get();
    return results.map(_rowToModel).toList();
  }

  @override
  Future<ExpenseModel> createExpense(ExpenseModel expense) async {
    await _db.into(_db.expenses).insert(ExpensesCompanion.insert(
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      categoryId: expense.categoryId,
      date: expense.date,
      note: Value(expense.note),
      receiptUrl: Value(expense.receiptUrl),
      createdAt: expense.createdAt,
    ));
    return expense;
  }

  @override
  Future<ExpenseModel> updateExpense(ExpenseModel expense) async {
    await (_db.update(_db.expenses)..where((t) => t.id.equals(expense.id)))
      .write(ExpensesCompanion(
        title: Value(expense.title),
        amount: Value(expense.amount),
        categoryId: Value(expense.categoryId),
        date: Value(expense.date),
        note: Value(expense.note),
        receiptUrl: Value(expense.receiptUrl),
      ));
    return expense;
  }

  @override
  Future<void> deleteExpense(String id) async {
    await (_db.delete(_db.expenses)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<double> getTotalByCategory(String categoryId) async {
    final expenses = await getExpensesByCategory(categoryId);
    return expenses.fold(0.0, (sum, e) => sum + e.amount);
  }

  @override
  Future<double> getTotalByDateRange(DateTime start, DateTime end) async {
    final expenses = await getExpensesByDateRange(start, end);
    return expenses.fold(0.0, (sum, e) => sum + e.amount);
  }

  @override
  Future<Map<String, double>> getTotalsByCategory() async {
    final expensesWithCategory = await getExpensesWithCategory();
    final Map<String, double> totals = {};
    for (final (expense, category) in expensesWithCategory) {
      totals[category.id] = (totals[category.id] ?? 0) + expense.amount;
    }
    return totals;
  }

  ExpenseModel _rowToModel(dynamic row) => ExpenseModel(
    id: row.id,
    title: row.title,
    amount: row.amount,
    categoryId: row.categoryId,
    date: row.date,
    note: row.note,
    receiptUrl: row.receiptUrl,
    createdAt: row.createdAt,
  );
}
```

## UseCases

```dart
// lib/features/expense/domain/usecases/get_expenses_with_category.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/expense_with_category.dart';
import '../repositories/expense_repository.dart';

@injectable
class GetExpensesWithCategory implements UseCase<List<ExpenseWithCategory>, NoParams> {
  final ExpenseRepository _repository;
  GetExpensesWithCategory(this._repository);

  @override
  Future<Either<Failure, List<ExpenseWithCategory>>> call(NoParams params) {
    return _repository.getExpensesWithCategory();
  }
}

// lib/features/expense/domain/usecases/get_expenses_by_category.dart
@injectable
class GetExpensesByCategory implements UseCase<List<Expense>, String> {
  final ExpenseRepository _repository;
  GetExpensesByCategory(this._repository);

  @override
  Future<Either<Failure, List<Expense>>> call(String categoryId) {
    return _repository.getExpensesByCategory(categoryId);
  }
}

// lib/features/expense/domain/usecases/get_expense_summary.dart
@freezed
sealed class ExpenseSummary with _$ExpenseSummary {
  const factory ExpenseSummary({
    required double total,
    required Map<String, double> byCategory,
    required Map<String, Category> categories,
  }) = _ExpenseSummary;
}

@injectable
class GetExpenseSummary implements UseCase<ExpenseSummary, DateTimeRange> {
  final ExpenseRepository _expenseRepository;
  final CategoryRepository _categoryRepository;

  GetExpenseSummary(this._expenseRepository, this._categoryRepository);

  @override
  Future<Either<Failure, ExpenseSummary>> call(DateTimeRange params) async {
    final totalResult = await _expenseRepository.getTotalByDateRange(params.start, params.end);
    final byCategoryResult = await _expenseRepository.getTotalsByCategory();
    final categoriesResult = await _categoryRepository.getCategories();

    return totalResult.fold(
      (failure) => Left(failure),
      (total) => byCategoryResult.fold(
        (failure) => Left(failure),
        (byCategory) => categoriesResult.fold(
          (failure) => Left(failure),
          (categories) => Right(ExpenseSummary(
            total: total,
            byCategory: byCategory,
            categories: {for (final c in categories) c.id: c},
          )),
        ),
      ),
    );
  }
}
```

## BLoC

```dart
// lib/features/expense/presentation/bloc/expense_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/expense.dart';
import '../../domain/entities/category.dart';
import '../../domain/entities/expense_with_category.dart';

part 'expense_bloc.freezed.dart';

// Events
@freezed
sealed class ExpenseEvent with _$ExpenseEvent {
  const factory ExpenseEvent.loadExpenses() = _LoadExpenses;
  const factory ExpenseEvent.loadByCategory(String categoryId) = _LoadByCategory;
  const factory ExpenseEvent.loadByDateRange(DateTime start, DateTime end) = _LoadByDateRange;
  const factory ExpenseEvent.createExpense(Expense expense) = _CreateExpense;
  const factory ExpenseEvent.deleteExpense(String id) = _DeleteExpense;
  const factory ExpenseEvent.loadCategories() = _LoadCategories;
}

// States
@freezed
sealed class ExpenseState with _$ExpenseState {
  const factory ExpenseState({
    @Default([]) List<ExpenseWithCategory> expenses,
    @Default([]) List<Category> categories,
    @Default(false) bool isLoading,
    String? error,
    String? selectedCategoryId,
    DateTime? startDate,
    DateTime? endDate,
    @Default(0) double totalAmount,
  }) = _ExpenseState;
}

// BLoC
@injectable
class ExpenseBloc extends Bloc<ExpenseEvent, ExpenseState> {
  final GetExpensesWithCategory _getExpensesWithCategory;
  final GetExpensesByCategory _getExpensesByCategory;
  final CreateExpense _createExpense;
  final DeleteExpense _deleteExpense;
  final GetCategories _getCategories;

  ExpenseBloc(
    this._getExpensesWithCategory,
    this._getExpensesByCategory,
    this._createExpense,
    this._deleteExpense,
    this._getCategories,
  ) : super(const ExpenseState()) {
    on<ExpenseEvent>((event, emit) async {
      await event.map(
        loadExpenses: (_) async {
          emit(state.copyWith(isLoading: true, error: null));
          final result = await _getExpensesWithCategory(const NoParams());
          result.fold(
            (failure) => emit(state.copyWith(isLoading: false, error: failure.message)),
            (expenses) {
              final total = expenses.fold(0.0, (sum, e) => sum + e.expense.amount);
              emit(state.copyWith(
                isLoading: false,
                expenses: expenses,
                totalAmount: total,
                selectedCategoryId: null,
              ));
            },
          );
        },
        loadByCategory: (e) async {
          emit(state.copyWith(isLoading: true, error: null, selectedCategoryId: e.categoryId));
          final result = await _getExpensesByCategory(e.categoryId);
          result.fold(
            (failure) => emit(state.copyWith(isLoading: false, error: failure.message)),
            (expenses) {
              // Need to map to ExpenseWithCategory
              add(const ExpenseEvent.loadExpenses());
            },
          );
        },
        loadByDateRange: (e) async {
          emit(state.copyWith(
            isLoading: true,
            startDate: e.start,
            endDate: e.end,
          ));
          // Filter existing expenses by date range
          final filtered = state.expenses.where((exp) {
            final date = exp.expense.date;
            return date.isAfter(e.start) && date.isBefore(e.end);
          }).toList();
          final total = filtered.fold(0.0, (sum, e) => sum + e.expense.amount);
          emit(state.copyWith(
            isLoading: false,
            expenses: filtered,
            totalAmount: total,
          ));
        },
        createExpense: (e) async {
          emit(state.copyWith(isLoading: true));
          final result = await _createExpense(e.expense);
          result.fold(
            (failure) => emit(state.copyWith(isLoading: false, error: failure.message)),
            (_) => add(const ExpenseEvent.loadExpenses()),
          );
        },
        deleteExpense: (e) async {
          final result = await _deleteExpense(e.id);
          result.fold(
            (failure) => emit(state.copyWith(error: failure.message)),
            (_) => add(const ExpenseEvent.loadExpenses()),
          );
        },
        loadCategories: (_) async {
          final result = await _getCategories(const NoParams());
          result.fold(
            (failure) => emit(state.copyWith(error: failure.message)),
            (categories) => emit(state.copyWith(categories: categories)),
          );
        },
      );
    });
  }
}
```

## Riverpod Alternative

```dart
// lib/features/expense/presentation/providers/expense_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/expense.dart';
import '../../domain/entities/category.dart';
import '../../domain/entities/expense_with_category.dart';

part 'expense_providers.g.dart';

@riverpod
class SelectedCategory extends _$SelectedCategory {
  @override
  String? build() => null;

  void select(String? categoryId) => state = categoryId;
}

@riverpod
class DateRangeFilter extends _$DateRangeFilter {
  @override
  (DateTime, DateTime)? build() => null;

  void setRange(DateTime start, DateTime end) => state = (start, end);
  void clear() => state = null;
}

@riverpod
Future<List<Category>> categories(CategoriesRef ref) async {
  final getCategories = getIt<GetCategories>();
  final result = await getCategories(const NoParams());
  return result.fold((f) => throw Exception(f.message), (c) => c);
}

@riverpod
Future<List<ExpenseWithCategory>> expenses(ExpensesRef ref) async {
  final getExpenses = getIt<GetExpensesWithCategory>();
  final result = await getExpenses(const NoParams());
  return result.fold((f) => throw Exception(f.message), (e) => e);
}

@riverpod
List<ExpenseWithCategory> filteredExpenses(FilteredExpensesRef ref) {
  final expensesAsync = ref.watch(expensesProvider);
  final selectedCategory = ref.watch(selectedCategoryProvider);
  final dateRange = ref.watch(dateRangeFilterProvider);

  return expensesAsync.when(
    data: (expenses) {
      var filtered = expenses;

      if (selectedCategory != null) {
        filtered = filtered.where((e) => e.expense.categoryId == selectedCategory).toList();
      }

      if (dateRange != null) {
        final (start, end) = dateRange;
        filtered = filtered.where((e) {
          final date = e.expense.date;
          return date.isAfter(start) && date.isBefore(end);
        }).toList();
      }

      return filtered;
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

@riverpod
double totalExpense(TotalExpenseRef ref) {
  final expenses = ref.watch(filteredExpensesProvider);
  return expenses.fold(0.0, (sum, e) => sum + e.expense.amount);
}

@riverpod
Map<String, double> expensesByCategory(ExpensesByCategoryRef ref) {
  final expenses = ref.watch(filteredExpensesProvider);
  final Map<String, double> result = {};
  for (final e in expenses) {
    result[e.category.id] = (result[e.category.id] ?? 0) + e.expense.amount;
  }
  return result;
}
```

## Widgets

```dart
// lib/features/expense/presentation/widgets/category_chip.dart
import 'package:flutter/material.dart';
import '../../domain/entities/category.dart';

class CategoryChip extends StatelessWidget {
  final Category category;
  final bool isSelected;
  final VoidCallback? onTap;

  const CategoryChip({
    super.key,
    required this.category,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = Color(int.parse(category.color.replaceFirst('#', '0xFF')));

    return FilterChip(
      label: Text(category.name),
      avatar: Icon(_getIconData(category.icon), size: 18, color: color),
      selected: isSelected,
      selectedColor: color.withOpacity(0.2),
      onSelected: (_) => onTap?.call(),
    );
  }

  IconData _getIconData(String iconName) {
    return switch (iconName) {
      'restaurant' => Icons.restaurant,
      'directions_car' => Icons.directions_car,
      'shopping_bag' => Icons.shopping_bag,
      'movie' => Icons.movie,
      'receipt' => Icons.receipt,
      'medical_services' => Icons.medical_services,
      _ => Icons.more_horiz,
    };
  }
}

// lib/features/expense/presentation/widgets/expense_summary_card.dart
class ExpenseSummaryCard extends StatelessWidget {
  final double total;
  final Map<String, double> byCategory;
  final Map<String, Category> categories;

  const ExpenseSummaryCard({
    super.key,
    required this.total,
    required this.byCategory,
    required this.categories,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Total: \$${total.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            ...byCategory.entries.map((entry) {
              final category = categories[entry.key];
              if (category == null) return const SizedBox.shrink();
              final percentage = (entry.value / total * 100);
              return _buildCategoryRow(context, category, entry.value, percentage);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryRow(
    BuildContext context,
    Category category,
    double amount,
    double percentage,
  ) {
    final color = Color(int.parse(category.color.replaceFirst('#', '0xFF')));

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(category.name)),
          Text('\$${amount.toStringAsFixed(2)}'),
          const SizedBox(width: 8),
          Text('${percentage.toStringAsFixed(1)}%',
            style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
```
