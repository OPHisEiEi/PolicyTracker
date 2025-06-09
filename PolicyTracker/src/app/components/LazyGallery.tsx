import React from "react";

interface Props {
  galleryUrls: string[];
  onClickImage: (url: string) => void;
}

const LazyGallery: React.FC<Props> = ({ galleryUrls, onClickImage }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {galleryUrls.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt={`Gallery ${idx}`}
          className="rounded-lg cursor-pointer"
          onClick={() => onClickImage(url)}
        />
      ))}
    </div>
  );
};

export default LazyGallery;
