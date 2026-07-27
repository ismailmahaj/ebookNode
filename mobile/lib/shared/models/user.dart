class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    this.isAdmin = false,
    this.subscriptionStatus,
    this.subscriptionEndsAt,
    this.hasActiveSubscription = false,
  });

  final int id;
  final String name;
  final String email;
  final bool isAdmin;
  final String? subscriptionStatus;
  final String? subscriptionEndsAt;
  final bool hasActiveSubscription;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      email: json['email'] as String,
      isAdmin: json['is_admin'] == true,
      subscriptionStatus: json['subscription_status'] as String?,
      subscriptionEndsAt: json['subscription_ends_at'] as String?,
      hasActiveSubscription: json['has_active_subscription'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'is_admin': isAdmin,
    'subscription_status': subscriptionStatus,
    'subscription_ends_at': subscriptionEndsAt,
    'has_active_subscription': hasActiveSubscription,
  };
}
