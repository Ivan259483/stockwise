import { ArrowLeft, ImagePlus, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCategories } from "../api/categories";
import { createProduct, getProduct, updateProduct } from "../api/products";
import { getSuppliers } from "../api/suppliers";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import { PageLoader } from "../components/ui/Spinner";
import Textarea from "../components/ui/Textarea";
import useFetch from "../hooks/useFetch";
import useForm from "../hooks/useForm";
import { IMAGE_TYPES, UNITS } from "../utils/constants";
import { getFieldErrors } from "../utils/errors";
import { formatNumber } from "../utils/formatters";
import { validateImageFile, validateProduct } from "../utils/validators";

const EMPTY_PRODUCT = {
  name: "",
  sku: "",
  category: "",
  supplier: "",
  description: "",
  unit: "pcs",
  costPrice: "",
  sellingPrice: "",
  quantity: "0",
  reorderLevel: "10",
  image: "",
};

/** Converts an API product into string form values for the inputs. */
const toFormValues = (product) => ({
  ...EMPTY_PRODUCT,
  name: product.name,
  sku: product.sku,
  category: product.category?._id ?? "",
  supplier: product.supplier?._id ?? "",
  description: product.description ?? "",
  unit: product.unit,
  costPrice: String(product.costPrice),
  sellingPrice: String(product.sellingPrice),
  quantity: String(product.quantity),
  reorderLevel: String(product.reorderLevel),
  image: product.image ?? "",
});

/** Reads a File into a base64 data URL for preview and upload. */
const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Create (/products/new) or edit (/products/:id/edit) a product. Admin only.
 * Quantity can be set only when creating; afterwards it changes through stock movements.
 */
export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { values, errors, setErrors, setField, handleChange, reset } = useForm(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);

  // Load dropdown options and (when editing) the product, in parallel.
  const { data, loading, error, refetch } = useFetch(
    () =>
      Promise.all([
        getCategories(),
        getSuppliers(),
        isEdit ? getProduct(id) : Promise.resolve(null),
      ]).then(([categories, suppliers, product]) => ({
        categories: categories.data,
        suppliers: suppliers.data,
        product: product?.data.product ?? null,
      })),
    [id]
  );

  useEffect(() => {
    reset(data?.product ? toFormValues(data.product) : EMPTY_PRODUCT);
  }, [data, reset]);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again after removing it
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      setErrors((previous) => ({ ...previous, image: problem }));
      return;
    }
    try {
      setField("image", await readAsDataUrl(file));
    } catch {
      setErrors((previous) => ({ ...previous, image: "Could not read that file. Please try another image." }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateProduct(values, { isEdit });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields.", { id: "product-form-invalid" });
      return;
    }

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim().toUpperCase(),
      category: values.category,
      supplier: values.supplier || null,
      description: values.description.trim(),
      unit: values.unit,
      costPrice: Number(values.costPrice),
      sellingPrice: Number(values.sellingPrice),
      reorderLevel: Number(values.reorderLevel),
      image: values.image,
      ...(isEdit ? {} : { quantity: Number(values.quantity) }),
    };

    setSaving(true);
    try {
      const body = isEdit ? await updateProduct(id, payload) : await createProduct(payload);
      toast.success(isEdit ? "Product updated" : "Product created");
      navigate(`/products/${body.data._id}`);
    } catch (submitError) {
      setErrors(getFieldErrors(submitError));
      setSaving(false);
    }
  };

  const title = isEdit ? "Edit product" : "Add product";
  const backLink = (
    <Link
      to={isEdit ? `/products/${id}` : "/products"}
      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Back
    </Link>
  );

  if (loading && !data) return <PageLoader label="Loading form…" />;
  if (error) {
    return (
      <>
        <PageHeader title={title}>{backLink}</PageHeader>
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    );
  }

  const categoryOptions = data.categories.map((c) => ({ value: c._id, label: c.name }));
  const supplierOptions = data.suppliers.map((s) => ({ value: s._id, label: s.name }));

  return (
    <>
      <PageHeader title={title} description={isEdit ? data.product?.name : "Add a new item to your catalogue."}>
        {backLink}
      </PageHeader>

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Product details" bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
            <Input
              label="Product name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              placeholder='e.g. Claw Hammer 16 oz'
              className="sm:col-span-2"
              maxLength={100}
              required
            />
            <Input
              label="SKU"
              name="sku"
              value={values.sku}
              onChange={handleChange}
              error={errors.sku}
              hint="Unique code, e.g. HT-HAM-016"
              className="[&_input]:uppercase"
              maxLength={30}
              required
            />
            <Select
              label="Unit"
              name="unit"
              value={values.unit}
              onChange={handleChange}
              error={errors.unit}
              options={UNITS.map((unit) => ({ value: unit, label: unit }))}
            />
            <Select
              label="Category"
              name="category"
              value={values.category}
              onChange={handleChange}
              error={errors.category}
              options={categoryOptions}
              placeholder="Choose a category…"
              hint={categoryOptions.length === 0 ? "No categories yet. Add one on the Categories page first." : undefined}
              required
            />
            <Select
              label="Supplier"
              name="supplier"
              value={values.supplier}
              onChange={handleChange}
              error={errors.supplier}
              options={supplierOptions}
              placeholder="None"
            />
            <Textarea
              label="Description"
              name="description"
              value={values.description}
              onChange={handleChange}
              error={errors.description}
              className="sm:col-span-2"
              maxLength={500}
            />
          </Card>

          <Card title="Pricing and stock" bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
            <Input
              label="Cost price (₱)"
              name="costPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.costPrice}
              onChange={handleChange}
              error={errors.costPrice}
              placeholder="0.00"
              required
            />
            <Input
              label="Selling price (₱)"
              name="sellingPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.sellingPrice}
              onChange={handleChange}
              error={errors.sellingPrice}
              placeholder="0.00"
              required
            />
            {isEdit ? (
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Current quantity</p>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                  {formatNumber(Number(values.quantity))} {values.unit}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">Use Stock In / Stock Out to change quantity.</p>
              </div>
            ) : (
              <Input
                label="Opening quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values.quantity}
                onChange={handleChange}
                error={errors.quantity}
                hint="Recorded as an opening stock movement."
                required
              />
            )}
            <Input
              label="Reorder level"
              name="reorderLevel"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.reorderLevel}
              onChange={handleChange}
              error={errors.reorderLevel}
              hint="Marked 'Low stock' at or below this."
              required
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Image" description="Optional. PNG, JPG, GIF or WebP up to 1 MB." bodyClassName="p-5">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
              {values.image ? (
                <img src={values.image} alt="Product preview" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-10 text-slate-300" aria-hidden="true" />
              )}
            </div>
            <input
              ref={fileInputRef}
              id="product-image"
              type="file"
              accept={IMAGE_TYPES.join(",")}
              onChange={handleImageChange}
              className="sr-only"
              aria-describedby={errors.image ? "product-image-error" : undefined}
            />
            {errors.image && (
              <p id="product-image-error" className="mt-2 text-xs font-medium text-red-600" role="alert">
                {errors.image}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" icon={ImagePlus} className="flex-1" onClick={() => fileInputRef.current?.click()}>
                {values.image ? "Change image" : "Upload image"}
              </Button>
              {values.image && (
                <Button variant="ghost" icon={Trash2} onClick={() => setField("image", "")} aria-label="Remove image" />
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button type="submit" icon={Save} loading={saving} className="w-full">
              {isEdit ? "Save changes" : "Create product"}
            </Button>
            <Button to={isEdit ? `/products/${id}` : "/products"} variant="secondary" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
