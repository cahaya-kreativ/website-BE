const { formatDateTimeWIB } = require("./formattedDate");

// Format price ke format Indonesia
const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID').format(price);
};

// Format untuk list product (data minimal)
const formatListProduct = (product) => {
    return {
        ...product,
        detail: product.detail ? product.detail.split(',').map(item => item.trim()) : [],
        note: product.note ? product.note.split(',').map(item => item.trim()) : [],
        addOn: product.addOn ? product.addOn.split(',').map(item => item.trim()) : [],
        price: formatPrice(product.price),
        createdAt: formatDateTimeWIB(product.createdAt)
    };
};

// Format untuk detail product (data lengkap)
const formatDetailProduct = (product) => {
    return {
        ...product,
        detail: product.detail ? product.detail.split(',').map(item => item.trim()) : [],
        note: product.note ? product.note.split(',').map(item => item.trim()) : [],
        addOn: product.addOn ? product.addOn.split(',').map(item => item.trim()) : [],
        price: formatPrice(product.price),
        createdAt: formatDateTimeWIB(product.createdAt)
    };
};

module.exports = {
    formatListProduct,
    formatDetailProduct
};