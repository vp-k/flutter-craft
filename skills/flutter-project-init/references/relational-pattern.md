# Relational Pattern Template

다중 엔티티 관계 패턴. 예: Blog (User-Post-Comment), E-commerce (User-Order-Item)

## Entities

```dart
// lib/features/blog/domain/entities/user.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
sealed class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    String? avatarUrl,
    String? bio,
    required DateTime createdAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

// lib/features/blog/domain/entities/post.dart
@freezed
sealed class Post with _$Post {
  const factory Post({
    required String id,
    required String authorId,
    required String title,
    required String content,
    List<String>? tags,
    String? coverImageUrl,
    @Default(false) bool isPublished,
    @Default(0) int viewCount,
    @Default(0) int likeCount,
    required DateTime createdAt,
    DateTime? publishedAt,
  }) = _Post;

  factory Post.fromJson(Map<String, dynamic> json) => _$PostFromJson(json);
}

// lib/features/blog/domain/entities/comment.dart
@freezed
sealed class Comment with _$Comment {
  const factory Comment({
    required String id,
    required String postId,
    required String authorId,
    String? parentId, // For nested comments
    required String content,
    @Default(0) int likeCount,
    required DateTime createdAt,
    DateTime? updatedAt,
  }) = _Comment;

  factory Comment.fromJson(Map<String, dynamic> json) => _$CommentFromJson(json);
}

// lib/features/blog/domain/entities/like.dart
@freezed
sealed class Like with _$Like {
  const factory Like({
    required String id,
    required String userId,
    required String targetId, // postId or commentId
    required LikeTargetType targetType,
    required DateTime createdAt,
  }) = _Like;

  factory Like.fromJson(Map<String, dynamic> json) => _$LikeFromJson(json);
}

enum LikeTargetType { post, comment }

// Composite entities
// lib/features/blog/domain/entities/post_with_author.dart
@freezed
sealed class PostWithAuthor with _$PostWithAuthor {
  const factory PostWithAuthor({
    required Post post,
    required User author,
    @Default(false) bool isLikedByCurrentUser,
  }) = _PostWithAuthor;
}

// lib/features/blog/domain/entities/comment_with_author.dart
@freezed
sealed class CommentWithAuthor with _$CommentWithAuthor {
  const factory CommentWithAuthor({
    required Comment comment,
    required User author,
    @Default([]) List<CommentWithAuthor> replies,
    @Default(false) bool isLikedByCurrentUser,
  }) = _CommentWithAuthor;
}

// lib/features/blog/domain/entities/post_detail.dart
@freezed
sealed class PostDetail with _$PostDetail {
  const factory PostDetail({
    required Post post,
    required User author,
    required List<CommentWithAuthor> comments,
    required int commentCount,
    @Default(false) bool isLikedByCurrentUser,
  }) = _PostDetail;
}
```

## Drift Tables

```dart
// lib/core/database/tables/blog_tables.dart
import 'package:drift/drift.dart';

class Users extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get email => text().unique()();
  TextColumn get avatarUrl => text().nullable()();
  TextColumn get bio => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Posts extends Table {
  TextColumn get id => text()();
  TextColumn get authorId => text().references(Users, #id)();
  TextColumn get title => text()();
  TextColumn get content => text()();
  TextColumn get tags => text().withDefault(const Constant('[]'))(); // JSON array
  TextColumn get coverImageUrl => text().nullable()();
  BoolColumn get isPublished => boolean().withDefault(const Constant(false))();
  IntColumn get viewCount => integer().withDefault(const Constant(0))();
  IntColumn get likeCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get publishedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class Comments extends Table {
  TextColumn get id => text()();
  TextColumn get postId => text().references(Posts, #id)();
  TextColumn get authorId => text().references(Users, #id)();
  TextColumn get parentId => text().nullable().references(Comments, #id)();
  TextColumn get content => text()();
  IntColumn get likeCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class Likes extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text().references(Users, #id)();
  TextColumn get targetId => text()();
  IntColumn get targetType => integer()(); // 0=post, 1=comment
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Repository Interfaces

```dart
// lib/features/blog/domain/repositories/user_repository.dart
import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user.dart';

abstract class UserRepository {
  Future<Either<Failure, User>> getCurrentUser();
  Future<Either<Failure, User>> getUserById(String id);
  Future<Either<Failure, User>> updateUser(User user);
  Future<Either<Failure, List<User>>> searchUsers(String query);
}

// lib/features/blog/domain/repositories/post_repository.dart
abstract class PostRepository {
  Future<Either<Failure, List<PostWithAuthor>>> getPosts({int? limit, int? offset});
  Future<Either<Failure, List<PostWithAuthor>>> getPostsByAuthor(String authorId);
  Future<Either<Failure, PostDetail>> getPostDetail(String postId);
  Future<Either<Failure, Post>> createPost(Post post);
  Future<Either<Failure, Post>> updatePost(Post post);
  Future<Either<Failure, Post>> publishPost(String postId);
  Future<Either<Failure, Unit>> deletePost(String postId);
  Future<Either<Failure, Unit>> incrementViewCount(String postId);
  Future<Either<Failure, bool>> toggleLike(String postId);
  Future<Either<Failure, List<PostWithAuthor>>> searchPosts(String query);
  Future<Either<Failure, List<PostWithAuthor>>> getPostsByTag(String tag);
}

// lib/features/blog/domain/repositories/comment_repository.dart
abstract class CommentRepository {
  Future<Either<Failure, List<CommentWithAuthor>>> getCommentsByPost(String postId);
  Future<Either<Failure, Comment>> createComment(Comment comment);
  Future<Either<Failure, Comment>> updateComment(Comment comment);
  Future<Either<Failure, Unit>> deleteComment(String commentId);
  Future<Either<Failure, bool>> toggleLike(String commentId);
  Future<Either<Failure, List<CommentWithAuthor>>> getReplies(String parentId);
}
```

## Local DataSource with Joins

```dart
// lib/features/blog/data/datasources/post_local_datasource.dart
import 'dart:convert';
import 'package:injectable/injectable.dart';
import '../../../../core/database/app_database.dart';
import '../models/post_model.dart';
import '../models/user_model.dart';
import '../models/comment_model.dart';

abstract class PostLocalDataSource {
  Future<List<(PostModel, UserModel)>> getPostsWithAuthor({int? limit, int? offset});
  Future<(PostModel, UserModel, List<(CommentModel, UserModel)>)?> getPostDetail(String postId);
  Future<PostModel> createPost(PostModel post);
  Future<void> updatePost(PostModel post);
  Future<void> deletePost(String postId);
  Future<void> incrementViewCount(String postId);
  Future<bool> toggleLike(String userId, String postId);
  Future<bool> isLikedByUser(String userId, String postId);
}

@Injectable(as: PostLocalDataSource)
class PostLocalDataSourceImpl implements PostLocalDataSource {
  final AppDatabase _db;

  PostLocalDataSourceImpl(this._db);

  @override
  Future<List<(PostModel, UserModel)>> getPostsWithAuthor({int? limit, int? offset}) async {
    var query = _db.select(_db.posts).join([
      innerJoin(_db.users, _db.users.id.equalsExp(_db.posts.authorId)),
    ]);

    query.orderBy([OrderingTerm.desc(_db.posts.createdAt)]);

    if (limit != null) {
      query.limit(limit, offset: offset);
    }

    final results = await query.get();
    return results.map((row) {
      final post = row.readTable(_db.posts);
      final user = row.readTable(_db.users);
      return (
        PostModel(
          id: post.id,
          authorId: post.authorId,
          title: post.title,
          content: post.content,
          tags: (jsonDecode(post.tags) as List).cast<String>(),
          coverImageUrl: post.coverImageUrl,
          isPublished: post.isPublished,
          viewCount: post.viewCount,
          likeCount: post.likeCount,
          createdAt: post.createdAt,
          publishedAt: post.publishedAt,
        ),
        UserModel(
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          createdAt: user.createdAt,
        ),
      );
    }).toList();
  }

  @override
  Future<(PostModel, UserModel, List<(CommentModel, UserModel)>)?> getPostDetail(String postId) async {
    // Get post with author
    final postQuery = _db.select(_db.posts).join([
      innerJoin(_db.users, _db.users.id.equalsExp(_db.posts.authorId)),
    ]);
    postQuery.where(_db.posts.id.equals(postId));

    final postResult = await postQuery.getSingleOrNull();
    if (postResult == null) return null;

    final post = postResult.readTable(_db.posts);
    final author = postResult.readTable(_db.users);

    // Get comments with authors
    final commentsQuery = _db.select(_db.comments).join([
      innerJoin(_db.users, _db.users.id.equalsExp(_db.comments.authorId)),
    ]);
    commentsQuery.where(_db.comments.postId.equals(postId));
    commentsQuery.orderBy([OrderingTerm.asc(_db.comments.createdAt)]);

    final commentsResult = await commentsQuery.get();
    final comments = commentsResult.map((row) {
      final comment = row.readTable(_db.comments);
      final commentAuthor = row.readTable(_db.users);
      return (
        CommentModel(
          id: comment.id,
          postId: comment.postId,
          authorId: comment.authorId,
          parentId: comment.parentId,
          content: comment.content,
          likeCount: comment.likeCount,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        ),
        UserModel(
          id: commentAuthor.id,
          name: commentAuthor.name,
          email: commentAuthor.email,
          avatarUrl: commentAuthor.avatarUrl,
          bio: commentAuthor.bio,
          createdAt: commentAuthor.createdAt,
        ),
      );
    }).toList();

    return (
      PostModel(
        id: post.id,
        authorId: post.authorId,
        title: post.title,
        content: post.content,
        tags: (jsonDecode(post.tags) as List).cast<String>(),
        coverImageUrl: post.coverImageUrl,
        isPublished: post.isPublished,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
      ),
      UserModel(
        id: author.id,
        name: author.name,
        email: author.email,
        avatarUrl: author.avatarUrl,
        bio: author.bio,
        createdAt: author.createdAt,
      ),
      comments,
    );
  }

  @override
  Future<bool> toggleLike(String userId, String postId) async {
    final existingLike = await (_db.select(_db.likes)
      ..where((t) => t.userId.equals(userId) & t.targetId.equals(postId) & t.targetType.equals(0)))
      .getSingleOrNull();

    if (existingLike != null) {
      // Unlike
      await (_db.delete(_db.likes)..where((t) => t.id.equals(existingLike.id))).go();
      await (_db.update(_db.posts)..where((t) => t.id.equals(postId)))
        .write(PostsCompanion(likeCount: _db.posts.likeCount - const Constant(1)));
      return false;
    } else {
      // Like
      await _db.into(_db.likes).insert(LikesCompanion.insert(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: userId,
        targetId: postId,
        targetType: 0,
        createdAt: DateTime.now(),
      ));
      await (_db.update(_db.posts)..where((t) => t.id.equals(postId)))
        .write(PostsCompanion(likeCount: _db.posts.likeCount + const Constant(1)));
      return true;
    }
  }

  @override
  Future<bool> isLikedByUser(String userId, String postId) async {
    final result = await (_db.select(_db.likes)
      ..where((t) => t.userId.equals(userId) & t.targetId.equals(postId) & t.targetType.equals(0)))
      .getSingleOrNull();
    return result != null;
  }

  // ... other implementations
}
```

## UseCases

```dart
// lib/features/blog/domain/usecases/get_post_feed.dart
import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/post_with_author.dart';
import '../repositories/post_repository.dart';

@freezed
sealed class FeedParams with _$FeedParams {
  const factory FeedParams({
    @Default(20) int limit,
    @Default(0) int offset,
  }) = _FeedParams;
}

@injectable
class GetPostFeed implements UseCase<List<PostWithAuthor>, FeedParams> {
  final PostRepository _repository;
  GetPostFeed(this._repository);

  @override
  Future<Either<Failure, List<PostWithAuthor>>> call(FeedParams params) {
    return _repository.getPosts(limit: params.limit, offset: params.offset);
  }
}

// lib/features/blog/domain/usecases/get_post_detail.dart
@injectable
class GetPostDetail implements UseCase<PostDetail, String> {
  final PostRepository _repository;
  GetPostDetail(this._repository);

  @override
  Future<Either<Failure, PostDetail>> call(String postId) async {
    // Increment view count
    await _repository.incrementViewCount(postId);
    return _repository.getPostDetail(postId);
  }
}

// lib/features/blog/domain/usecases/create_post.dart
@injectable
class CreatePost implements UseCase<Post, Post> {
  final PostRepository _repository;
  CreatePost(this._repository);

  @override
  Future<Either<Failure, Post>> call(Post post) {
    return _repository.createPost(post);
  }
}

// lib/features/blog/domain/usecases/toggle_post_like.dart
@injectable
class TogglePostLike implements UseCase<bool, String> {
  final PostRepository _repository;
  TogglePostLike(this._repository);

  @override
  Future<Either<Failure, bool>> call(String postId) {
    return _repository.toggleLike(postId);
  }
}

// lib/features/blog/domain/usecases/add_comment.dart
@injectable
class AddComment implements UseCase<Comment, Comment> {
  final CommentRepository _repository;
  AddComment(this._repository);

  @override
  Future<Either<Failure, Comment>> call(Comment comment) {
    return _repository.createComment(comment);
  }
}
```

## Riverpod Providers

```dart
// lib/features/blog/presentation/providers/post_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/post_with_author.dart';
import '../../domain/entities/post_detail.dart';

part 'post_providers.g.dart';

@riverpod
class PostFeed extends _$PostFeed {
  int _offset = 0;
  final int _limit = 20;
  bool _hasMore = true;

  @override
  Future<List<PostWithAuthor>> build() async {
    _offset = 0;
    _hasMore = true;
    return _loadPosts();
  }

  Future<List<PostWithAuthor>> _loadPosts() async {
    final getPostFeed = getIt<GetPostFeed>();
    final result = await getPostFeed(FeedParams(limit: _limit, offset: _offset));
    return result.fold(
      (f) => throw Exception(f.message),
      (posts) {
        if (posts.length < _limit) _hasMore = false;
        return posts;
      },
    );
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    _offset += _limit;
    final morePosts = await _loadPosts();
    state = AsyncData([...state.value ?? [], ...morePosts]);
  }

  Future<void> refresh() async {
    _offset = 0;
    _hasMore = true;
    state = const AsyncLoading();
    state = AsyncData(await _loadPosts());
  }
}

@riverpod
Future<PostDetail> postDetail(PostDetailRef ref, String postId) async {
  final getPostDetail = getIt<GetPostDetail>();
  final result = await getPostDetail(postId);
  return result.fold(
    (f) => throw Exception(f.message),
    (detail) => detail,
  );
}

@riverpod
class PostActions extends _$PostActions {
  @override
  FutureOr<void> build() {}

  Future<void> toggleLike(String postId) async {
    final togglePostLike = getIt<TogglePostLike>();
    final result = await togglePostLike(postId);
    result.fold(
      (f) => state = AsyncError(f.message, StackTrace.current),
      (isLiked) {
        ref.invalidate(postFeedProvider);
        ref.invalidate(postDetailProvider(postId));
      },
    );
  }

  Future<void> addComment(String postId, String content, {String? parentId}) async {
    final addComment = getIt<AddComment>();
    final currentUser = await getIt<GetCurrentUser>()(const NoParams());

    await currentUser.fold(
      (f) async => state = AsyncError(f.message, StackTrace.current),
      (user) async {
        final comment = Comment(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          postId: postId,
          authorId: user.id,
          parentId: parentId,
          content: content,
          createdAt: DateTime.now(),
        );

        final result = await addComment(comment);
        result.fold(
          (f) => state = AsyncError(f.message, StackTrace.current),
          (_) => ref.invalidate(postDetailProvider(postId)),
        );
      },
    );
  }
}
```

## Widgets

```dart
// lib/features/blog/presentation/widgets/post_card.dart
import 'package:flutter/material.dart';
import '../../domain/entities/post_with_author.dart';

class PostCard extends StatelessWidget {
  final PostWithAuthor postWithAuthor;
  final VoidCallback? onTap;
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onShare;

  const PostCard({
    super.key,
    required this.postWithAuthor,
    this.onTap,
    this.onLike,
    this.onComment,
    this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    final post = postWithAuthor.post;
    final author = postWithAuthor.author;

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image
            if (post.coverImageUrl != null)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  post.coverImageUrl!,
                  fit: BoxFit.cover,
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Author info
                  _buildAuthorRow(context, author),
                  const SizedBox(height: 12),

                  // Title
                  Text(
                    post.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),

                  // Content preview
                  Text(
                    post.content,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),

                  // Tags
                  if (post.tags?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: post.tags!
                          .map((tag) => Chip(
                                label: Text(tag),
                                visualDensity: VisualDensity.compact,
                              ))
                          .toList(),
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Actions
                  _buildActionsRow(context, post),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuthorRow(BuildContext context, User author) {
    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundImage: author.avatarUrl != null
              ? NetworkImage(author.avatarUrl!)
              : null,
          child: author.avatarUrl == null
              ? Text(author.name[0].toUpperCase())
              : null,
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              author.name,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            Text(
              _formatDate(postWithAuthor.post.createdAt),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionsRow(BuildContext context, Post post) {
    return Row(
      children: [
        _ActionButton(
          icon: postWithAuthor.isLikedByCurrentUser
              ? Icons.favorite
              : Icons.favorite_border,
          label: post.likeCount.toString(),
          color: postWithAuthor.isLikedByCurrentUser ? Colors.red : null,
          onTap: onLike,
        ),
        const SizedBox(width: 16),
        _ActionButton(
          icon: Icons.comment_outlined,
          label: 'Comment',
          onTap: onComment,
        ),
        const SizedBox(width: 16),
        _ActionButton(
          icon: Icons.share_outlined,
          label: 'Share',
          onTap: onShare,
        ),
        const Spacer(),
        Text(
          '${post.viewCount} views',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 7) {
      return '${date.month}/${date.day}/${date.year}';
    } else if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inMinutes}m ago';
    }
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color)),
        ],
      ),
    );
  }
}

// lib/features/blog/presentation/widgets/comment_tile.dart
class CommentTile extends StatelessWidget {
  final CommentWithAuthor commentWithAuthor;
  final VoidCallback? onLike;
  final VoidCallback? onReply;
  final int depth;

  const CommentTile({
    super.key,
    required this.commentWithAuthor,
    this.onLike,
    this.onReply,
    this.depth = 0,
  });

  @override
  Widget build(BuildContext context) {
    final comment = commentWithAuthor.comment;
    final author = commentWithAuthor.author;

    return Padding(
      padding: EdgeInsets.only(left: depth * 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundImage: author.avatarUrl != null
                    ? NetworkImage(author.avatarUrl!)
                    : null,
                child: author.avatarUrl == null
                    ? Text(author.name[0])
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          author.name,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatDate(comment.createdAt),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(comment.content),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        TextButton.icon(
                          onPressed: onLike,
                          icon: Icon(
                            commentWithAuthor.isLikedByCurrentUser
                                ? Icons.favorite
                                : Icons.favorite_border,
                            size: 16,
                          ),
                          label: Text('${comment.likeCount}'),
                        ),
                        TextButton.icon(
                          onPressed: onReply,
                          icon: const Icon(Icons.reply, size: 16),
                          label: const Text('Reply'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Nested replies
          if (commentWithAuthor.replies.isNotEmpty)
            ...commentWithAuthor.replies.map((reply) => CommentTile(
              commentWithAuthor: reply,
              depth: depth + 1,
            )),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d';
    if (diff.inHours > 0) return '${diff.inHours}h';
    return '${diff.inMinutes}m';
  }
}
```
