class AppException implements Exception {
  const AppException(this.message);
  final String message;

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException([
    super.message = 'Connexion impossible. Vérifiez votre réseau.',
  ]);
}

class SessionExpiredException extends AppException {
  const SessionExpiredException([
    super.message = 'Session expirée. Reconnectez-vous.',
  ]);
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Accès non autorisé.']);
}

class SubscriptionRequiredException extends AppException {
  const SubscriptionRequiredException([
    super.message = 'Un abonnement actif est requis pour accéder à ce contenu.',
  ]);
}

class NotFoundException extends AppException {
  const NotFoundException([super.message = 'Contenu introuvable.']);
}

class ServerException extends AppException {
  const ServerException([
    super.message = 'Erreur serveur. Réessayez plus tard.',
  ]);
}

class ValidationException extends AppException {
  const ValidationException(super.message, {this.fieldErrors = const {}});
  final Map<String, List<String>> fieldErrors;
}
