"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
var providers_1 = require("@/lib/providers");
require("./globals.css");
exports.metadata = {
    title: 'RecipeOS',
    description: 'A culinary toolkit for chefs and home cooks.',
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="en">
      <body>
        <providers_1.Providers>{children}</providers_1.Providers>
      </body>
    </html>);
}
