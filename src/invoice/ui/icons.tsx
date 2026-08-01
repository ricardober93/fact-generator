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
