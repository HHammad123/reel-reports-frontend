import {
    jsx as _jsx,
    Fragment as _Fragment,
    jsxs as _jsxs
} from "react/jsx-runtime";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import {
  Monitor,
  Square,
  Smartphone,
  Instagram,
  Settings2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../../ui/button';
// Aspect ratio options with icons and display names
const ASPECT_RATIO_OPTIONS = [
  {
    value: '16:9',
    label: '16:9',
    description: 'Widescreen',
    icon: Monitor,
    color: 'text-blue-500',
  },
  {
    value: '9:16',
    label: '9:16',
    description: 'Vertical',
    icon: Smartphone,
    color: 'text-purple-500',
  },
//   {
//     value: '1:1',
//     label: '1:1',
//     description: 'Square',
//     icon: Square,
//     color: 'text-green-500',
//   },
//   {
//     value: '4:5',
//     label: '4:5',
//     description: 'Portrait',
//     icon: Instagram,
//     color: 'text-pink-500',
//   },
];

// Get supported aspect ratio values
const SUPPORTED_RATIOS = ASPECT_RATIO_OPTIONS.map((opt) => opt.value);

export const AspectRatioDropdown = ({
  aspectRatio,
  onAspectRatioChange,
  disabled = false,
  className = '',
}) => {
  // Use aspect ratio directly if it's already in the correct format (e.g., "9:16")
  // If it's not in the supported list, fall back to default
  const effectiveAspectRatio = aspectRatio && SUPPORTED_RATIOS.includes(aspectRatio)
    ? aspectRatio
    : ASPECT_RATIO_OPTIONS[0].value;
  const currentOption = ASPECT_RATIO_OPTIONS.find(
    (option) => option.value === effectiveAspectRatio
  );

  /**
   * When aspect ratio changes, all overlays are automatically transformed
   * to maintain their relative positions on the new canvas size.
   * This is handled by the editor provider using aspect-ratio-transform utility.
   */
  return (_jsx("div", {
    className: "hidden md:block bg-white",
    children: _jsxs(DropdownMenu, {
      children: [_jsx(DropdownMenuTrigger, {
        asChild: true,
        children: _jsxs(Button, {
          variant: "outline",
          size: "sm",
          disabled: disabled,
          className: `gap-2 min-w-[90px] justify-between border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-none ${className}`,
          onTouchStart: (e) => e.preventDefault(),
          style: {
            WebkitTapHighlightColor: 'transparent'
          },
          children: [_jsx("div", {
            className: "flex items-center gap-2",
            children: currentOption ? (_jsxs(_Fragment, {
              children: [_jsx(currentOption.icon, {
                className: `h-3.5 w-3.5 ${currentOption.color}`
              }), _jsx("span", {
                className: "ext-text-primary font-extralight text-xs",
                children: currentOption.label
              })]
            })) : (_jsx("span", {
              className: "ext-text-primary font-extralight text-xs",
              children: effectiveAspectRatio
            }))
          }), _jsx(ChevronDown, {
            className: "h-3 w-3 opacity-50"
          })]
        })
      }), _jsxs(DropdownMenuContent, {
        className: "w-56 border-border bg-popover bg-white",
        align: "start",
        children: [_jsxs(DropdownMenuLabel, {
          className: "flex items-center gap-2 text-popover-foreground font-extralight",
          children: [_jsx(Settings2, {
            className: "h-4 w-4"
          }), "Aspect Ratio"]
        }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuRadioGroup, {
          value: effectiveAspectRatio,
          onValueChange: (value) => onAspectRatioChange(value),
          children: ASPECT_RATIO_OPTIONS.map((option) => (_jsxs(DropdownMenuRadioItem, {
            value: option.value,
            className: "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            children: [_jsx(option.icon, {
              className: `h-4 w-4 ${option.color}`
            }), _jsxs("div", {
              className: "flex flex-col",
              children: [_jsxs("div", {
                className: "flex items-center gap-2",
                children: [_jsx("span", {
                  className: "font-mono text-xs font-extralight",
                  children: option.label
                }), effectiveAspectRatio === option.value && (_jsx(Check, {
                  className: "h-3 w-3 text-primary"
                }))]
              }), _jsx("span", {
                className: "text-xs text-muted-foreground font-extralight",
                children: option.description
              })]
            })]
          }, option.value)))
        })]
      })]
    })
  }));
};