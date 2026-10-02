import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { IUser } from 'types/User.ts';
import { Alert, Button, Card } from 'ui';
import { DOWNLOAD, MPOST, MUPLOAD } from 'ui/api/fetchers.ts';
import { IEdit } from 'ui/icons.tsx';

type UserBrandFormProps = {
  className?: string;
  user: IUser.user;
  onUpdated: () => Promise<unknown>;
};

type UserBrandFormValues = {
  name: string;
  primaryColor: string;
};

type PreparedLogo = {
  file: File;
  color: string;
};

const MAX_LOGO_EDGE = 512;

const loadImage = async (file: File): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const getDominantColor = (context: CanvasRenderingContext2D, width: number, height: number): string => {
  const pixels = context.getImageData(0, 0, width, height).data;
  const colors = new Map<string, number>();

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 128) continue;

    const red = Math.round(pixels[index] / 32) * 32;
    const green = Math.round(pixels[index + 1] / 32) * 32;
    const blue = Math.round(pixels[index + 2] / 32) * 32;
    if (red > 224 && green > 224 && blue > 224) continue;

    const color = `#${[red, green, blue].map((value) => Math.min(255, value).toString(16).padStart(2, '0')).join('')}`;
    colors.set(color, (colors.get(color) ?? 0) + 1);
  }

  return [...colors.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '#055dfe';
};

const prepareLogo = async (file: File): Promise<PreparedLogo> => {
  if (!file.type.startsWith('image/')) throw new Error('Select an image file.');
  if (file.size > 10_000_000) throw new Error('Select an image smaller than 10 MB.');

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process the image.');

  context.drawImage(image, 0, 0, width, height);
  const color = getDominantColor(context, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not convert the image.'))), 'image/png');
  });

  return { file: new File([blob], 'logo.png', { type: 'image/png' }), color };
};

export const UserBrandForm = ({ className, user, onUpdated }: UserBrandFormProps) => {
  const { mutate: mutateCache } = useSWRConfig();
  const [previewUrl, setPreviewUrl] = React.useState<string>();
  const [pendingLogo, setPendingLogo] = React.useState<File>();
  const [previousColor, setPreviousColor] = React.useState<string>();
  const [dragging, setDragging] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [imageError, setImageError] = React.useState('');
  const brandMutation = useSWRMutation('/user/update-brand', MPOST);
  const logoMutation = useSWRMutation('/user/logo', MUPLOAD);
  const form = useForm<UserBrandFormValues>({ defaultValues: { name: user.name ?? '', primaryColor: user.primary_color ?? '#055dfe' } });
  const primaryColor = form.watch('primaryColor');

  React.useEffect(() => {
    let active = true;
    DOWNLOAD('/user/logo')
      .then((blob) => {
        if (active) setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setLogo = async (file: File) => {
    setImageError('');

    try {
      const prepared = await prepareLogo(file);
      setPendingLogo(prepared.file);
      setPreviewUrl(URL.createObjectURL(prepared.file));
      setPreviousColor(primaryColor);
      form.setValue('primaryColor', prepared.color, { shouldDirty: true });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not process the image.');
    }
  };

  const submit = async (values: UserBrandFormValues) => {
    setSaved(false);
    try {
      await brandMutation.trigger({ name: values.name || null, primary_color: values.primaryColor });
      if (pendingLogo) {
        const formData = new FormData();
        formData.append('file', pendingLogo);
        await logoMutation.trigger(formData);
      }
      await mutateCache(
        (key) => {
          const path = typeof key === 'string' ? key : Array.isArray(key) ? key[0] : undefined;
          return typeof path === 'string' && (path === '/me' || path === '/auth/me' || path === '/user' || path.startsWith('/user/'));
        },
        undefined,
        { revalidate: false },
      );
      await onUpdated();
      setPendingLogo(undefined);
      setSaved(true);
    } catch {}
  };

  const error = imageError || brandMutation.error?.message || logoMutation.error?.message;

  return (
    <Card as="section" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Brand</h2>
          <p className="mt-1 max-w-xl text-pulsio-muted text-sm">Set your account name, logo, and dashboard color.</p>
        </div>
        <span className="hidden rounded-full bg-blue-50 p-2 text-pulsio-blue sm:block">
          <IEdit size={19} />
        </span>
      </div>

      <FormProvider {...form}>
        <form className="mt-6 max-w-xl space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <label className="pulsio-control">
            <span className="pulsio-control-label">Name</span>
            <input className="pulsio-control-input" {...form.register('name', { maxLength: { value: 80, message: 'Use up to 80 characters.' } })} />
          </label>

          <div>
            <span className="pulsio-control-label">Logo</span>
            <label
              className={`mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-4 text-center transition-colors ${dragging ? 'border-pulsio-blue bg-blue-50' : 'border-pulsio-line bg-pulsio-surface'}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) void setLogo(file);
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Logo preview" className="mb-3 max-h-24 max-w-48 object-contain" />
              ) : (
                <span className="mb-3 text-pulsio-muted">Drop your logo here</span>
              )}
              <span className="text-pulsio-blue text-sm">Choose an image or drag it here</span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void setLogo(file);
                }}
              />
            </label>
          </div>

          <div className="flex items-end gap-3">
            <label className="pulsio-control flex-1">
              <span className="pulsio-control-label">Primary color</span>
              <input className="h-11 w-full cursor-pointer rounded-sm border border-pulsio-line bg-white p-1" type="color" {...form.register('primaryColor')} />
            </label>
            {previousColor && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  form.setValue('primaryColor', previousColor, { shouldDirty: true });
                  setPreviousColor(undefined);
                }}
              >
                Revert to previous color
              </Button>
            )}
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {saved && <Alert tone="success">Brand settings updated.</Alert>}
          <Button type="submit" disabled={brandMutation.isMutating || logoMutation.isMutating}>
            {brandMutation.isMutating || logoMutation.isMutating ? 'Saving…' : 'Save brand settings'}
          </Button>
        </form>
      </FormProvider>
    </Card>
  );
};
