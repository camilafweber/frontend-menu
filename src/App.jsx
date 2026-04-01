import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import CartPage from "./pages/CartPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyPage from "./pages/CompanyPage";
import DishesPage from "./pages/DishesPage";
import DishPage from "./pages/DishPage";
import { categoryOptions, companies, dishes, profileImageUrl } from "./data/mockData";

const COMPANY_PAGE_SIZE = 3;
const DISH_PAGE_SIZE = 5;

function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    currentPage: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

function useCartState() {
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const savedCart = window.localStorage.getItem("frontend-menu-cart");
      if (!savedCart) {
        return [];
      }

      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem("frontend-menu-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  const addToCart = (dish, quantity = 1) => {
    setCartItems((current) => {
      const existingItem = current.find((item) => item.id === dish.id);

      if (existingItem) {
        return current.map((item) =>
          item.id === dish.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.price,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          id: dish.id,
          name: dish.name,
          image_url: dish.image_url ?? dish.imageUrl,
          price: dish.price,
          quantity,
          subtotal: dish.price * quantity,
        },
      ];
    });
  };

  const updateQuantity = (dishId, delta) => {
    setCartItems((current) =>
      current
        .map((item) => {
          if (item.id !== dishId) {
            return item;
          }

          const quantity = item.quantity + delta;

          if (quantity <= 0) {
            return null;
          }

          return {
            ...item,
            quantity,
            subtotal: quantity * item.price,
          };
        })
        .filter(Boolean),
    );
  };

  const removeFromCart = (dishId) => {
    setCartItems((current) => current.filter((item) => item.id !== dishId));
  };

  return {
    cartItems,
    cartCount,
    totalPrice,
    addToCart,
    decreaseItem: (dishId) => updateQuantity(dishId, -1),
    increaseItem: (dishId) => updateQuantity(dishId, 1),
    removeFromCart,
  };
}

function CompaniesRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSearch = searchParams.get("search") ?? "";
  const selectedCategoryId = searchParams.get("category_id")
    ? Number(searchParams.get("category_id"))
    : null;
  const page = Number(searchParams.get("page") ?? "1");

  const filteredCompanies = companies.filter((company) => {
    const matchesCategory =
      !selectedCategoryId || company.category_id === selectedCategoryId;
    const searchValue = selectedSearch.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      company.name.toLowerCase().includes(searchValue) ||
      company.summary.toLowerCase().includes(searchValue);

    return matchesCategory && matchesSearch;
  });

  const { items, currentPage, totalPages } = paginate(
    filteredCompanies,
    page,
    COMPANY_PAGE_SIZE,
  );

  const buildCompaniesHref = (nextPage, categoryId, search) => {
    const params = new URLSearchParams();

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    if (categoryId) {
      params.set("category_id", String(categoryId));
    }
    if (search) {
      params.set("search", search);
    }

    const query = params.toString();
    return query ? `/companies?${query}` : "/companies";
  };

  return (
    <CompaniesPage
      companies={items}
      categoryOptions={categoryOptions}
      selectedCategoryId={selectedCategoryId}
      selectedSearch={selectedSearch}
      currentPage={currentPage}
      totalPages={totalPages}
      profileImageUrl={profileImageUrl}
      onSearchSubmit={({ search, categoryId }) =>
        navigate(buildCompaniesHref(1, categoryId, search))
      }
      onCategorySelect={(categoryId) =>
        navigate(buildCompaniesHref(1, categoryId, selectedSearch))
      }
      onPageChange={(nextPage) =>
        navigate(buildCompaniesHref(nextPage, selectedCategoryId, selectedSearch))
      }
      getCategoryHref={(categoryId, search) =>
        buildCompaniesHref(1, categoryId, search)
      }
      getPageHref={(nextPage) =>
        buildCompaniesHref(nextPage, selectedCategoryId, selectedSearch)
      }
    />
  );
}

function CompanyRoute({ cartCount, addToCart }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const selectedSearch = searchParams.get("search") ?? "";
  const company = companies.find((entry) => entry.id === Number(id));

  if (!company) {
    return <Navigate to="/companies" replace />;
  }

  const filteredDishes = dishes.filter((dish) => {
    if (dish.company_id !== company.id) {
      return false;
    }

    const searchValue = selectedSearch.trim().toLowerCase();

    return (
      !searchValue ||
      dish.name.toLowerCase().includes(searchValue) ||
      dish.descript.toLowerCase().includes(searchValue)
    );
  });

  return (
    <CompanyPage
      company={company}
      dishes={filteredDishes}
      cartCount={cartCount}
      selectedSearch={selectedSearch}
      onSearchSubmit={(search) =>
        navigate(search ? `/company/${company.id}?search=${encodeURIComponent(search)}` : `/company/${company.id}`)
      }
      onAddToCart={(dish) => addToCart(dish, 1)}
      getDishHref={(dish) => `/dish/${dish.id}`}
      getAddToCartHref={(dish) => `/company/${company.id}`}
    />
  );
}

function DishesRoute({ cartCount, addToCart }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSearch = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const filteredDishes = dishes.filter((dish) => {
    const searchValue = selectedSearch.trim().toLowerCase();
    return (
      !searchValue ||
      dish.name.toLowerCase().includes(searchValue) ||
      dish.descript.toLowerCase().includes(searchValue) ||
      dish.category_name.toLowerCase().includes(searchValue)
    );
  });

  const { items, currentPage, totalPages } = paginate(
    filteredDishes,
    page,
    DISH_PAGE_SIZE,
  );

  const buildDishesHref = (nextPage, search) => {
    const params = new URLSearchParams();

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    if (search) {
      params.set("search", search);
    }

    const query = params.toString();
    return query ? `/dishes?${query}` : "/dishes";
  };

  return (
    <DishesPage
      dishes={items}
      selectedSearch={selectedSearch}
      currentPage={currentPage}
      totalPages={totalPages}
      cartCount={cartCount}
      currentUrl={buildDishesHref(currentPage, selectedSearch)}
      profileImageUrl={profileImageUrl}
      onSearchSubmit={(search) => navigate(buildDishesHref(1, search))}
      onPageChange={(nextPage) => navigate(buildDishesHref(nextPage, selectedSearch))}
      onAddToCart={(dish) => addToCart(dish, 1)}
      getDishHref={(dish) => `/dish/${dish.id}`}
      getPageHref={(nextPage) => buildDishesHref(nextPage, selectedSearch)}
    />
  );
}

function DishRoute({ cartCount, addToCart }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const dish = dishes.find((entry) => entry.id === Number(id));

  if (!dish) {
    return <Navigate to="/dishes" replace />;
  }

  return (
    <DishPage
      dish={dish}
      cartCount={cartCount}
      currentUrl={`${location.pathname}${location.search}`}
      profileImageUrl={profileImageUrl}
      onAddToCart={(selectedDish, quantity) => {
        addToCart(selectedDish, quantity);
        navigate("/cart");
      }}
    />
  );
}

function CartRoute({
  cartItems,
  cartCount,
  totalPrice,
  decreaseItem,
  increaseItem,
  removeFromCart,
}) {
  return (
    <CartPage
      items={cartItems}
      cartCount={cartCount}
      totalPrice={totalPrice}
      onDecreaseItem={(item) => decreaseItem(item.id)}
      onIncreaseItem={(item) => increaseItem(item.id)}
      onRemoveItem={(item) => removeFromCart(item.id)}
    />
  );
}

export default function App() {
  const cart = useCartState();

  const defaultCompanyId = useMemo(() => companies[0]?.id ?? 1, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/companies" replace />} />
      <Route path="/companies" element={<CompaniesRoute />} />
      <Route
        path="/company/:id"
        element={
          <CompanyRoute cartCount={cart.cartCount} addToCart={cart.addToCart} />
        }
      />
      <Route
        path="/dishes"
        element={
          <DishesRoute cartCount={cart.cartCount} addToCart={cart.addToCart} />
        }
      />
      <Route
        path="/dish/:id"
        element={<DishRoute cartCount={cart.cartCount} addToCart={cart.addToCart} />}
      />
      <Route
        path="/cart"
        element={
          <CartRoute
            cartItems={cart.cartItems}
            cartCount={cart.cartCount}
            totalPrice={cart.totalPrice}
            decreaseItem={cart.decreaseItem}
            increaseItem={cart.increaseItem}
            removeFromCart={cart.removeFromCart}
          />
        }
      />
      <Route path="*" element={<Navigate to={`/company/${defaultCompanyId}`} replace />} />
    </Routes>
  );
}
