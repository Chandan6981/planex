const validateCreateProject = (req, res, next) => {
  const { name } = req.body;

  if (!name?.trim())
    return res.status(400).json({ message: 'Project name is required' });

  if (name.trim().length > 100)
    return res.status(400).json({ message: 'Project name must be under 100 characters' });

  next();
};

const validateUpdateProject = (req, res, next) => {
  const { name } = req.body;

  if (name !== undefined) {
    if (!name?.trim())
      return res.status(400).json({ message: 'Project name cannot be empty' });
    if (name.trim().length > 100)
      return res.status(400).json({ message: 'Project name must be under 100 characters' });
  }

  next();
};

module.exports = { validateCreateProject, validateUpdateProject };
