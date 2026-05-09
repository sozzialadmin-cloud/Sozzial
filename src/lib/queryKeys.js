export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'],
  },
  spots: {
    all: ['spots'],
    list: (filters = {}) => ['spots', 'list', filters],
    detail: (id) => ['spots', 'detail', id],
    ratings: (spotId) => ['spots', 'ratings', spotId],
  },
  plans: {
    all: ['plans'],
    discover: (filters = {}) => ['plans', 'discover', filters],
    detail: (id) => ['plans', 'detail', id],
    mine: ['plans', 'mine'],
    members: (planId) => ['plans', 'members', planId],
    messages: (planId) => ['plans', 'messages', planId],
  },
  settings: {
    public: ['settings', 'public'],
  },
}

