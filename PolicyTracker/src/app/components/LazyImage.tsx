import { useEffect, useRef, useState } from "react";

export default function LazyImage({ src, alt, className }: { src: string, alt: string, className?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); 
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={visible ? src : "/default-profile.png"}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
