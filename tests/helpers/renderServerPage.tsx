import { render } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { expect } from "vitest";

type AsyncComponent = (props: Record<string, unknown>) => Promise<ReactElement>;

/**
 * Pages now return a Suspense shell around an async server component. jsdom
 * cannot resolve async components, so unwrap the child and await it directly.
 */
export async function renderServerPage(page: ReactElement) {
  expect(page.type).toBe(Suspense);
  const content = (page.props as { children: ReactElement }).children;
  const component = content.type as AsyncComponent;
  return render(await component(content.props as Record<string, unknown>));
}
