import * as Linking from 'expo-linking';
import { Href, Link } from 'expo-router';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in the system browser (supports private/incognito mode)
          // On iOS: Opens Safari with option for Private mode
          // On Android: Opens Chrome with Incognito mode option
          await Linking.openURL(href);
        }
      }}
    />
  );
}
