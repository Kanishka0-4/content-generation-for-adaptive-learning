"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ type }) {
  const router = useRouter();
  const isLogin = type === "login";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  //old function. revert if error occurs
  /*
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
*/

const handleChange = (e) => {
  const updatedForm = {
    ...form,
    [e.target.name]: e.target.value,
  };

  setForm(updatedForm);

  // ✅ Clear error when user types
  setError("");

  // ✅ OPTIONAL: live validation (better UX)
  if (e.target.name === "email") {
    const email = updatedForm.email;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Invalid email format");
      return;
    }

    const allowedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
    ];

    const domain = email.split("@")[1]?.toLowerCase();

    if (domain && !allowedDomains.includes(domain)) {
      setError("Use Gmail, Yahoo, Outlook, etc.");
      return;
    }

    // ✅ If everything is valid → clear error
    setError("");
  }
};



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      setError("Invalid email format");
      setLoading(false);
      return;
    }

    // ✅ Domain restriction
    const allowedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
    ];

    const domain = form.email.split("@")[1].toLowerCase();

    if (!allowedDomains.includes(domain)) {
      setError("Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(isLogin ? "/api/login" : "/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      // Save JWT token
      localStorage.setItem("token", data.token);

      // Redirect based on quiz status
      if (isLogin) {
        if (data.quiz_completed === false) {
          router.push("/quiz/welcome");
        } else {
          router.push("/");
        }
      } else {
        router.push("/quiz/welcome");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-700 to-indigo-800">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
          {isLogin ? "Welcome Back!" : "Create Your Account"}
        </h2>

        {!isLogin && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-all"
        >
          {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </button>

        <p className="text-sm text-center mt-4">
          {isLogin ? "New user?" : "Already have an account?"}{" "}
          <a
            href={isLogin ? "/signup" : "/login"}
            className="text-indigo-600 hover:underline"
          >
            {isLogin ? "Create an account" : "Login here"}
          </a>
        </p>
      </form>
    </div>
  );
}
