function paginationPage(page = 1, limit = 5) {
    let skip = 0;
    let take = limit;
  
    if (isNaN(page)) {
      page = 1;
    }
  
    skip = (page - 1) * take;
    return {
      skip,
      take,
    };
  }
  
  function paginationPageTotal(totalData, dataPerPage = 5) {
    if (dataPerPage <= 0) {
      throw new Error("dataPerPage must be greater than 0");
    }
  
    return Math.ceil(totalData / dataPerPage);
  }
  
  module.exports = {
    paginationPage,
    paginationPageTotal,
  };
  