import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { MenuPage } from './pages/MenuPage';
import { NotFoundPage } from './pages/NotFoundPage';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/menu/:slug", element: _jsx(MenuPage, {}) }), _jsx(Route, { path: "/404", element: _jsx(NotFoundPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/404", replace: true }) })] }) }) }));
