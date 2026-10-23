import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import Cropper from "react-easy-crop";
import "./ImageUploadForm.css";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const OUTPUT_SIZE = 400; // 400 x 400 px

// Kiểm tra file, trả về true nếu hợp lệ, hoặc câu thông báo lỗi
function checkFile(file) {
  if (!file) return "Vui lòng chọn ảnh";
  if (!ALLOWED_TYPES.includes(file.type)) return "Chỉ chấp nhận ảnh JPG hoặc PNG";
  if (file.size > MAX_SIZE) return "Dung lượng ảnh tối đa là 5MB";
  return true;
}

// Tải ảnh từ url để vẽ lên canvas
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Cắt vùng đã chọn và thu/phóng về đúng 400x400
async function getCroppedBlob(imageSrc, area, type) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height, // vùng lấy từ ảnh gốc
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE           // vẽ vào canvas 400x400
  );

  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

export default function ImageUploadForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({ mode: "onChange" }); // báo lỗi ngay khi chọn file

  const [imageSrc, setImageSrc] = useState(null);       // ảnh gốc để cắt
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null); // vùng cắt (pixel)
  const [croppedBlob, setCroppedBlob] = useState(null); // ảnh đã cắt
  const [previewUrl, setPreviewUrl] = useState(null);   // link xem trước

  const file = watch("image")?.[0]; // file người dùng vừa chọn

  // Mỗi khi đổi file: xóa kết quả cũ, tạo link ảnh gốc nếu file hợp lệ
  useEffect(() => {
    setCroppedBlob(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    if (file && checkFile(file) === true) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url); // dọn bộ nhớ
    }
    setImageSrc(null);
  }, [file]);

  // Dọn link xem trước cũ
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleCrop = async () => {
    const blob = await getCroppedBlob(imageSrc, croppedArea, file.type);
    setCroppedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    clearErrors("image");
  };

  const onSubmit = () => {
    if (!croppedBlob) {
      setError("image", { type: "manual", message: "Vui lòng cắt ảnh trước khi gửi" });
      return;
    }
    console.log("Ảnh đã cắt:", croppedBlob);
    alert("Gửi form thành công!");
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit(onSubmit)}>
      <h2>Upload Image</h2>

      {/* 1. Chọn ảnh */}
      <input
        type="file"
        accept="image/png, image/jpeg"
        {...register("image", {
          required: "Vui lòng chọn ảnh",
          validate: {
            fileType: (files) =>
              ALLOWED_TYPES.includes(files[0]?.type) || "Chỉ chấp nhận ảnh JPG hoặc PNG",
            fileSize: (files) =>
              files[0]?.size <= MAX_SIZE || "Dung lượng ảnh tối đa là 5MB",
          },
        })}
      />
      {errors.image && <p className="error">{errors.image.message}</p>}

      {/* 2. Cắt ảnh */}
      {imageSrc && (
        <>
          <div className="crop-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <label className="zoom">
            Zoom:
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <button type="button" onClick={handleCrop}>
            Crop (400 x 400)
          </button>
        </>
      )}

      {/* 3. Xem trước */}
      {previewUrl && (
        <div className="preview">
          <p>Preview (400 x 400 px):</p>
          <img src={previewUrl} alt="Preview" width={400} height={400} />
        </div>
      )}

      <div className="actions">
        <button type="submit">Submit</button>
        <button type="button" onClick={() => reset()}>
          Reset
        </button>
      </div>
    </form>
  );
}