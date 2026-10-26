import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './icon';
type IconName = Parameters<typeof Icon>[0]['name'];
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName;
  label: string;
};
export function IconButton({ icon, label, className = '', ...props }: Props) {
  return (
    <button type="button" aria-label={label} className={`icon-button ${className}`} {...props}>
      <Icon name={icon} />
    </button>
  );
}
