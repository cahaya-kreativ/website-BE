const formatSchedule = (schedule) => {
    return {
      id: schedule.id,
      date: schedule.date.toISOString().split('T')[0],
      time: schedule.time.toISOString().split('T')[1].substring(0, 5).replace(':', '.'),
      location: schedule.location,
      isBooked: schedule.isBooked,
      duration: schedule.duration,
      createdAt: schedule.createdAt,
      ...(schedule.orders && { orders: schedule.orders })
    };
  };
  
  module.exports = { formatSchedule };