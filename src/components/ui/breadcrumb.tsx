import React from "react";

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  separator?: React.ReactNode;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ separator = "›", children, ...props }) => {
  return (
    <nav aria-label="breadcrumb" {...props}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        {React.Children.toArray(children).map((child, index, arr) => (
          <React.Fragment key={index}>
            {child}
            {index < arr.length - 1 && (
              <li className="mx-1 text-gray-400 select-none" aria-hidden="true">
                {separator}
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

export const BreadcrumbItem: React.FC<React.HTMLAttributes<HTMLLIElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <li className={`inline-flex items-center ${className}`} {...props}>
    {children}
  </li>
);

export const BreadcrumbLink: React.FC<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { isCurrentPage?: boolean }
> = ({ isCurrentPage = false, className = "", ...props }) =>
  isCurrentPage ? (
    <span
      aria-current="page"
      className={`font-medium text-gray-900 ${className}`}
      {...props}
    />
  ) : (
    <a className={`hover:text-gray-700 transition-colors ${className}`} {...props} />
  );

export const BreadcrumbEllipsis: React.FC = () => (
  <span className="px-2 text-gray-400" aria-hidden="true">
    ...
  </span>
);

export default Breadcrumb;
