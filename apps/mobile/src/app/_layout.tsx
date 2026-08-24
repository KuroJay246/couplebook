import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { MobileLoginScreen } from '@/components/mobile-login-screen';
import { useAuth } from '@/hooks/use-auth';
import { useCoupleData } from '@/hooks/use-couple-data';
import { AuthProvider } from '@/providers/auth-provider';
import { CoupleDataProvider } from '@/providers/couple-data-provider';

SplashScreen.preventAutoHideAsync();

function AuthorizedTabs() {
  const { theme } = useCoupleData();

  return (
    <ThemeProvider value={theme.isDark ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthorized } = useAuth();

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />
      {isAuthorized ? (
        <CoupleDataProvider>
          <AuthorizedTabs />
        </CoupleDataProvider>
      ) : (
        <MobileLoginScreen />
      )}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
