// Preserve the original DOM JSON contract alongside Workers' stricter Body type.
interface Request { json<T = any>(): Promise<T>; }
interface Response { json<T = any>(): Promise<T>; }
type RouteContext<Path extends string> = {
  params: Promise<Path extends `${string}[revisionId]${string}` ? { id:string; revisionId:string } : { id:string }>;
};
