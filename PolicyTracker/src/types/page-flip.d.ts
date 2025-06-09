declare module "page-flip" {
  export interface PageFlip {
    flipNext: () => void;
    flipPrev: () => void;
  }

  const PageFlipConstructor: {
    new (...args: any[]): PageFlip;
  };

  export default PageFlipConstructor;
}
