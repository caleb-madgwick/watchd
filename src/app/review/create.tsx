import { Redirect } from 'expo-router';

/** Reviews are written from the Log flow — search a title, then log + review. */
export default function CreateReviewRedirect() {
  return <Redirect href="/(tabs)/log" />;
}
