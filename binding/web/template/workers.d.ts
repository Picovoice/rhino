declare module 'web-worker:*' {
  const WorkerFactory: new () => RhinoWorker;
  export default WorkerFactory;
}
