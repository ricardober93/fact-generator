import type { VNode } from '@wabot-dev/framework/ui'

function icon(children: VNode): VNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function ArrowUpIcon(): VNode {
  return icon(
    <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </>,
  )
}

export function ArrowDownIcon(): VNode {
  return icon(
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>,
  )
}

export function CloseIcon(): VNode {
  return icon(
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
  )
}

function alignIcon(line: VNode, bars: VNode): VNode {
  return icon(
    <>
      {line}
      {bars}
    </>,
  )
}

export function AlignLeftIcon(): VNode {
  return alignIcon(
    <path d="M3 3v18" />,
    <>
      <rect x="7" y="5" width="13" height="5" rx="1" />
      <rect x="7" y="14" width="8" height="5" rx="1" />
    </>,
  )
}

export function AlignCenterXIcon(): VNode {
  return alignIcon(
    <path d="M12 3v18" />,
    <>
      <rect x="4" y="5" width="16" height="5" rx="1" />
      <rect x="7" y="14" width="10" height="5" rx="1" />
    </>,
  )
}

export function AlignRightIcon(): VNode {
  return alignIcon(
    <path d="M21 3v18" />,
    <>
      <rect x="4" y="5" width="13" height="5" rx="1" />
      <rect x="9" y="14" width="8" height="5" rx="1" />
    </>,
  )
}

export function AlignTopIcon(): VNode {
  return alignIcon(
    <path d="M3 3h18" />,
    <>
      <rect x="5" y="7" width="5" height="13" rx="1" />
      <rect x="14" y="7" width="5" height="8" rx="1" />
    </>,
  )
}

export function AlignMiddleIcon(): VNode {
  return alignIcon(
    <path d="M3 12h18" />,
    <>
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="7" width="5" height="10" rx="1" />
    </>,
  )
}

export function AlignBottomIcon(): VNode {
  return alignIcon(
    <path d="M3 21h18" />,
    <>
      <rect x="5" y="4" width="5" height="13" rx="1" />
      <rect x="14" y="9" width="5" height="8" rx="1" />
    </>,
  )
}

export function DistributeXIcon(): VNode {
  return alignIcon(
    <>
      <path d="M3 3v18" />
      <path d="M21 3v18" />
    </>,
    <rect x="9" y="7" width="6" height="10" rx="1" />,
  )
}

export function DistributeYIcon(): VNode {
  return alignIcon(
    <>
      <path d="M3 3h18" />
      <path d="M3 21h18" />
    </>,
    <rect x="7" y="9" width="10" height="6" rx="1" />,
  )
}

export function ZoomInIcon(): VNode {
  return icon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
      <path d="m20 20-4-4" />
    </>,
  )
}

export function ZoomOutIcon(): VNode {
  return icon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6" />
      <path d="m20 20-4-4" />
    </>,
  )
}

export function FitWidthIcon(): VNode {
  return icon(
    <>
      <path d="M3 5v14" />
      <path d="M21 5v14" />
      <path d="M7 12h10" />
      <path d="m10 9-3 3 3 3" />
      <path d="m14 9 3 3-3 3" />
    </>,
  )
}
