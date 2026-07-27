abstract final class ApiConstants {
  static const authRegister = '/auth/register';
  static const authLogin = '/auth/login';
  static const authLogout = '/auth/logout';
  static const authMe = '/auth/me';

  static const ebooks = '/ebooks';
  static String ebook(int id) => '/ebooks/$id';
  static String ebookPreview(int id) => '/ebooks/$id/preview';
  static String ebookStream(int id) => '/ebooks/$id/stream';

  static const categories = '/categories';

  static const subscriptionStatus = '/subscription/status';
  static const subscriptionCheckout = '/subscription/checkout';
  static const subscriptionSync = '/subscription/sync';
}
